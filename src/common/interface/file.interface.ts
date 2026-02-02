import { FileType } from '@prisma';

export interface MultipleFileOptions {
  destinationFolder: string;
  prefix: string;
  fileType?: FileType;
  fileSizeLimit?: number;
  maxFileCount?: number;
  customMimeTypes?: string[];
}
