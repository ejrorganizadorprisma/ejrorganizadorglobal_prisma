// Indústria (UI) — internamente "manufacturer" por retrocompatibilidade.
// Cadastro central usado por produtos e fornecedores (FK manufacturer_id).

export type ManufacturerStatus = 'ACTIVE' | 'INACTIVE';

export interface Manufacturer {
  id: string;
  code?: string;
  name: string;
  legalName?: string;
  notes?: string;
  status: ManufacturerStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateManufacturerDTO {
  name: string;
  legalName?: string;
  notes?: string;
  status?: ManufacturerStatus;
}

export interface UpdateManufacturerDTO {
  name?: string;
  legalName?: string;
  notes?: string;
  status?: ManufacturerStatus;
}
