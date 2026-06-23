// Marca — atributo comercial do produto. Pode (opcionalmente) estar ligada a
// uma Indústria (manufacturer).

export type BrandStatus = 'ACTIVE' | 'INACTIVE';

export interface Brand {
  id: string;
  code?: string;
  name: string;
  manufacturerId?: string;   // Indústria vinculada (opcional)
  manufacturerName?: string; // nome da indústria (join, leitura)
  notes?: string;
  status: BrandStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandDTO {
  name: string;
  manufacturerId?: string | null;
  notes?: string;
  status?: BrandStatus;
}

export interface UpdateBrandDTO {
  name?: string;
  manufacturerId?: string | null;
  notes?: string;
  status?: BrandStatus;
}
