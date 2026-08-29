import { Pipe, PipeTransform } from '@angular/core';
import { formatCpfCnpj } from '@utils/document-utils';

@Pipe({
  name: 'cpfCnpj',
  standalone: true,
})
export class CpfCnpjPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatCpfCnpj(value);
  }
}
