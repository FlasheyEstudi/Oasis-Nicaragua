// OASIS - Family API Service
// GET /family, POST /family, DELETE /family/:id

import { get, post, del } from './client';

export interface FamilyMember {
  id: string;
  patient_id?: string;
  caregiver_id?: string;
  relationship: string;
  isActive: boolean;
  createdAt: string;
  patient?: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    profile: any;
  };
  caregiver?: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
  };
}

export interface FamilyResponse {
  caregiverFor: FamilyMember[];
  patientOf: FamilyMember[];
}

export interface CreateFamilyRequest {
  patient_email: string;
  relationship: 'padre' | 'madre' | 'hijo' | 'conyuge' | 'tutor' | 'otro';
}

/** Get user's family members list */
export async function getFamily(): Promise<FamilyResponse> {
  const result = await get<FamilyResponse>('/family');
  return result.data;
}

/** Link caregiver to patient */
export async function createFamily(data: CreateFamilyRequest): Promise<FamilyMember> {
  const result = await post<FamilyMember>('/family', data);
  return result.data;
}

/** Remove family relationship */
export async function deleteFamily(id: string): Promise<void> {
  await del(`/family/${id}`);
}

/** Act as a dependent family member to get delegated context token */
export async function actAsFamily(id: string): Promise<{ token: string; user: any }> {
  const result = await post<{ token: string; user: any }>(`/family/${id}/act-as`);
  return result.data;
}

/** Verify family relationship using 6-digit link PIN */
export async function verifyFamily(code: string): Promise<{ relation: FamilyMember; supervisorName: string; supervisorEmail: string }> {
  const result = await post<{ relation: FamilyMember; supervisorName: string; supervisorEmail: string }>('/family/verify', { code });
  return result.data;
}
