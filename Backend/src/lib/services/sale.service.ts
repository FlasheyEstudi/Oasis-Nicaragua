// OASIS - Sale Service
// Create sales, apply senior discounts, handle NIO/USD conversions and deduct stock via FEFO

import { db } from '../db';
import { createAuditLog } from './audit.service';

/**
 * Calculates patient's age from birthdate string (YYYY-MM-DD)
 */
function calculateAge(birthDateStr: string): number {
  try {
    const birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return 0;
  }
}

/**
 * Create a sale with multi-currency checkout, FEFO inventory decrements, and Ley 160 senior discounts
 */
export async function createSale(
  pharmacyId: string,
  data: {
    items: Array<{ medicine_id: string; quantity: number }>;
    prescription_id?: string;
    is_delivery: boolean;
    delivery_address?: string;
    delivery_lat?: number;
    delivery_lng?: number;
    notes?: string;
    appointment_id?: string;
    clinic_id?: string;
    payments?: Array<{ amount: number; method: string; currency?: string; transaction_id?: string }>;
  },
  patientId?: string,
  creatorId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  let totalAmount = 0;
  let changeAmount = 0;
  let finalResult: any = null;
  let applySeniorDiscount = false;

  return await db.$transaction(async (tx) => {
    // 1. Check senior citizen eligibility (Age >= 60 -> Ley 160)
    if (patientId) {
      const patientProfile = await tx.patientProfile.findUnique({
        where: { userId: patientId },
        select: { dateOfBirth: true }
      });
      if (patientProfile?.dateOfBirth) {
        const age = calculateAge(patientProfile.dateOfBirth);
        if (age >= 60) {
          applySeniorDiscount = true;
        }
      }
    }

    // 2. Fetch exchange rate setting (default to 36.50 commercial rate for Managua)
    let exchangeRate = 36.50;
    try {
      const rateSetting = await tx.globalSetting.findUnique({
        where: { key: 'USD_EXCHANGE_RATE' },
      });
      if (rateSetting?.value) {
        const rate = parseFloat(rateSetting.value);
        if (!isNaN(rate) && rate > 0) exchangeRate = rate;
      }
    } catch (e) {
      console.warn('USD_EXCHANGE_RATE not found, using default 36.50');
    }

    // 3. Process items, calculate prices, apply discounts (20% on medicines, 30% on consultations)
    const saleItemsData: Array<{ medicine_id: string; quantity: number; unit_price: number }> = [];

    for (const item of data.items) {
      let unitPrice = 0;

      if (data.clinic_id) {
        // Clinical consultation price resolution
        const settings = await tx.clinicSettings.findUnique({
          where: { clinicId: data.clinic_id },
          select: { baseConsultationFee: true }
        });
        const baseFee = settings?.baseConsultationFee ?? 350; // C$350 baseline
        unitPrice = applySeniorDiscount ? baseFee * 0.70 : baseFee; // 30% discount
      } else {
        // Pharmacy medicine price resolution
        const inventoryItem = await tx.inventory.findFirst({
          where: { pharmacyId, medicineId: item.medicine_id },
        });

        if (!inventoryItem || inventoryItem.quantity < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK: Medicamento ${item.medicine_id} sin stock suficiente.`);
        }

        const basePrice = inventoryItem.unitPrice;
        unitPrice = applySeniorDiscount ? basePrice * 0.80 : basePrice; // 20% discount
      }

      totalAmount += unitPrice * item.quantity;
      saleItemsData.push({
        medicine_id: item.medicine_id,
        quantity: item.quantity,
        unit_price: unitPrice,
      });
    }

    // 4. Add delivery fee if delivery is requested
    if (data.is_delivery && pharmacyId && !data.clinic_id) {
      const pharmacy = await tx.pharmacy.findUnique({ where: { id: pharmacyId }, select: { deliveryFee: true } });
      if (pharmacy) {
        totalAmount += pharmacy.deliveryFee;
      }
    }

    // 5. Verify payments and compute change (vuelto in NIO)
    if (data.payments && data.payments.length > 0) {
      let paidTotalInNio = 0;
      for (const p of data.payments) {
        if (p.amount < 0) throw new Error('INVALID_PAYMENT_AMOUNT');
        paidTotalInNio += p.currency === 'USD' ? p.amount * exchangeRate : p.amount;
      }
      if (paidTotalInNio < totalAmount - 0.01) {
        throw new Error('INSUFFICIENT_PAYMENT');
      }
      changeAmount = paidTotalInNio - totalAmount;
    }

    // Resolve payment methods in DB to get their IDs
    const dbMethods = await tx.paymentMethod.findMany();
    const findMethodId = (methodName: string): string => {
      const normalized = methodName.toLowerCase();
      const match = dbMethods.find(m => 
        m.name.toLowerCase() === normalized ||
        (normalized === 'cash' && m.name.toLowerCase().includes('efectivo')) ||
        (normalized === 'card' && m.name.toLowerCase().includes('tarjeta')) ||
        (normalized === 'bank_transfer' && m.name.toLowerCase().includes('transferencia')) ||
        (normalized === 'wallet' && m.name.toLowerCase().includes('billetera'))
      );
      return match ? match.id : (dbMethods[0]?.id || 'cash-id');
    };

    // 6. Create Sale record
    const sale = await tx.sale.create({
      data: {
        pharmacyId: data.clinic_id ? undefined : pharmacyId,
        clinicId: data.clinic_id,
        appointmentId: data.appointment_id,
        patientId,
        prescriptionId: data.prescription_id,
        isDelivery: data.is_delivery,
        deliveryAddress: data.delivery_address,
        deliveryLat: data.delivery_lat,
        deliveryLng: data.delivery_lng,
        deliveryNotes: data.notes,
        totalAmount,
        status: data.is_delivery ? 'pending' : 'completed',
        saleItems: {
          create: saleItemsData.map((item) => ({
            medicineId: item.medicine_id,
            quantity: item.quantity,
            unitPrice: item.unit_price,
          })),
        },
        payments: {
          create: data.payments && data.payments.length > 0
            ? data.payments.map((p) => ({
                amount: p.amount,
                methodId: findMethodId(p.method),
                currency: p.currency || 'NIO',
                status: 'completed',
                transactionId: p.transaction_id || null,
                notes: p.method === 'cash' && changeAmount > 0 ? `Vuelto: C$ ${changeAmount.toFixed(2)}` : null,
              }))
            : [
                {
                  amount: totalAmount,
                  methodId: findMethodId('cash'),
                  currency: 'NIO',
                  status: 'completed',
                  notes: null,
                },
              ],
        },
      },
    });

    // 7. Deduct inventory and update prescription lines (Only for pharmacy sales)
    if (pharmacyId && !data.clinic_id) {
      for (const item of data.items) {
        const inventoryItem = await tx.inventory.findFirst({
          where: { pharmacyId, medicineId: item.medicine_id },
          include: {
            batches: {
              where: {
                quantity: { gt: 0 },
                OR: [
                  { expirationDate: { gte: new Date() } },
                  { expirationDate: null }
                ]
              },
              orderBy: { expirationDate: 'asc' }, // FEFO
            }
          }
        });

        if (inventoryItem) {
          let remaining = item.quantity;
          for (const batch of inventoryItem.batches) {
            if (remaining <= 0) break;
            const deduct = Math.min(batch.quantity, remaining);
            await tx.inventoryBatch.update({
              where: { id: batch.id },
              data: { quantity: { decrement: deduct } }
            });
            
            // Record Kardex movement per batch
            await tx.inventoryMovement.create({
              data: {
                inventoryId: inventoryItem.id,
                batchId: batch.id,
                userId: creatorId || patientId || 'system',
                quantityChange: -deduct,
                type: 'sale',
                reason: `Venta #${sale.id.slice(-6)} (FEFO Lote: ${batch.batchNumber})`,
              }
            });
            remaining -= deduct;
          }

          if (remaining > 0) {
            throw new Error(`INSUFFICIENT_STOCK: Medicamento ${item.medicine_id} sin stock en lotes activos.`);
          }

          // Update total inventory count
          await tx.inventory.update({
            where: { id: inventoryItem.id },
            data: { quantity: { decrement: item.quantity } },
          });

          // Trigger inventory low alert
          const settings = await tx.pharmacySettings.findUnique({ where: { pharmacyId } });
          const threshold = settings?.minStockAlertThreshold ?? 10;
          if (inventoryItem.quantity - item.quantity <= threshold) {
            await tx.notification.create({
              data: {
                userId: creatorId || 'system',
                title: '⚠️ Alerta de Inventario Bajo',
                body: `El stock total del medicamento ha caído a ${inventoryItem.quantity - item.quantity} unidades.`,
                type: 'low_stock'
              }
            });
          }
        }

        // Update Prescription line if linked
        if (data.prescription_id) {
          const pLine = await tx.prescriptionLine.findFirst({
            where: { prescriptionId: data.prescription_id, medicineId: item.medicine_id }
          });
          if (pLine) {
            const newFulfilled = pLine.quantityFulfilled + item.quantity;
            await tx.prescriptionLine.update({
              where: { id: pLine.id },
              data: { quantityFulfilled: newFulfilled > pLine.quantity ? pLine.quantity : newFulfilled }
            });
          }
        }
      }

      // Re-evaluate prescription status
      if (data.prescription_id) {
        const lines = await tx.prescriptionLine.findMany({ where: { prescriptionId: data.prescription_id } });
        const allFulfilled = lines.length > 0 && lines.every(l => l.quantityFulfilled >= l.quantity);
        const anyFulfilled = lines.some(l => l.quantityFulfilled > 0);
        await tx.prescription.update({
          where: { id: data.prescription_id },
          data: { status: allFulfilled ? 'fulfilled' : anyFulfilled ? 'partially_fulfilled' : 'active' }
        });
      }
    }

    // 8. Create Delivery Order if delivery requested
    if (data.is_delivery && data.delivery_address) {
      const pharmacy = await tx.pharmacy.findUnique({ where: { id: pharmacyId }, include: { address: true } });
      await tx.deliveryOrder.create({
        data: {
          saleId: sale.id,
          pharmacyId,
          patientId: patientId || creatorId || '',
          pickupAddress: pharmacy?.address?.address || '',
          pickupLat: pharmacy?.address?.latitude || 0,
          pickupLng: pharmacy?.address?.longitude || 0,
          deliveryAddress: data.delivery_address,
          deliveryLat: data.delivery_lat || 0,
          deliveryLng: data.delivery_lng || 0,
          notes: data.notes,
          statusId: 'pending', // maps to DeliveryStatus
        },
      });
    }

    // 9. Fetch finished sale payload
    finalResult = await tx.sale.findUnique({
      where: { id: sale.id },
      include: {
        saleItems: { include: { medicine: true } },
        pharmacy: { include: { address: true } },
        deliveryOrder: true,
        payments: true,
      },
    });

    return finalResult;
  });

  if (!finalResult) return null;

  // 10. Log audit logs and notifications
  await createAuditLog({
    userId: creatorId || patientId,
    action: 'create',
    entityType: 'sale',
    entityId: finalResult.id,
    ipAddress,
    userAgent,
    details: JSON.stringify({
      total: totalAmount,
      vuelto: changeAmount,
      discountsApplied: applySeniorDiscount ? 'Adulto Mayor Ley 160' : 'Ninguno'
    })
  });

  if (patientId) {
    await db.notification.create({
      data: {
        userId: patientId!,
        title: '🛒 Compra Confirmada',
        body: `Tu factura por C$ ${totalAmount.toFixed(2)} ha sido procesada exitosamente.`,
        type: 'sale_created'
      }
    });
  }

  return finalResult;
}
