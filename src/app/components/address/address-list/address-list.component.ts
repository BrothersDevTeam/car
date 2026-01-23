import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  OnDestroy,
  ElementRef, // Import ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

import { AddressCardComponent } from '../address-card/address-card.component';
import { AddressFormComponent } from '../address-form/address-form.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { UnsavedChangesDialogComponent } from '@components/dialogs/unsaved-changes-dialog/unsaved-changes-dialog.component';

import { AddressService } from '@services/address.service';
import { FormDraftService, FormDraft } from '@services/form-draft.service';
import { Address } from '@interfaces/address';

@Component({
  selector: 'app-address-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    AddressCardComponent,
    AddressFormComponent,
  ],
  templateUrl: './address-list.component.html',
  styleUrl: './address-list.component.scss',
})
export class AddressListComponent implements OnInit, OnChanges, OnDestroy {
  @Input() personId!: string;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Input() canAdd = true;
  @Input() initialDraftId: string | null = null;

  addresses: Address[] = [];
  loading = false;
  showForm = false;
  editingAddress: Address | null = null;

  availableDrafts: FormDraft[] = [];
  selectedDraft: FormDraft | null = null;
  selectedDraftId: string | null = null; // To pass to form
  private subscriptions: Subscription[] = [];

  @ViewChild(AddressFormComponent) addressForm?: AddressFormComponent;
  @ViewChild('formContainer') formContainer!: ElementRef;

  constructor(
    private addressService: AddressService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private formDraftService: FormDraftService
  ) {}

  ngOnInit() {
    if (this.personId) {
      this.loadAddresses();
      this.loadAvailableDrafts();
    }

    this.subscriptions.push(
      this.formDraftService.draftsChanges.subscribe(() => {
        this.loadAvailableDrafts();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['personId']) {
      console.log(
        'AddressList: personId changed',
        changes['personId'].currentValue
      );
      if (!changes['personId'].firstChange) {
        this.loadAddresses();
        this.loadAvailableDrafts();
      }
    }

    if (changes['initialDraftId'] && this.initialDraftId) {
      console.log(
        'AddressList: initialDraftId changed to',
        this.initialDraftId
      );
      this.openDraft(this.initialDraftId);
    }
  }

  openDraft(draftId: string) {
    console.log('AddressList: openDraft called for', draftId);
    if (this.availableDrafts.length === 0) {
      console.log('AddressList: availableDrafts empty, loading...');
      this.loadAvailableDrafts();
    }

    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (draft) {
      console.log('AddressList: Draft found, selecting...', draft);
      this.handleDraftSelection(draft);
    } else {
      console.warn('AddressList: Draft not found for id', draftId);
      console.log('Available drafts:', this.availableDrafts);

      // Fallback: Check if it exists in ALL drafts, maybe filter failed?
      const allDrafts = this.formDraftService.getDraftsByType('endereco');
      const foundInAll = allDrafts.find((d) => d.id === draftId);
      if (foundInAll) {
        console.warn(
          'AddressList: Draft found in raw list but filtered out!',
          foundInAll
        );
        console.warn('Filter check:', {
          draftPersonId: (foundInAll.data as any).personId,
          componentPersonId: this.personId,
          match: (foundInAll.data as any).personId == this.personId,
        });
        // If found, force open it?
        if ((foundInAll.data as any).personId == this.personId) {
          console.log('AddressList: forcing open because ID matches roughly');
          this.handleDraftSelection(foundInAll);
        }
      }
    }
  }

  loadAvailableDrafts() {
    console.log('AddressList: loading drafts for personId', this.personId);
    this.availableDrafts = this.formDraftService
      .getDraftsByType('endereco')
      .filter((d) => {
        const data = d.data as any;
        // Use loose equality to handle string/number differences
        return !data.personId || data.personId == this.personId;
      })
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    console.log('AddressList: Drafts loaded', this.availableDrafts.length);
  }

  handleDraftSelection(draft: FormDraft) {
    console.log('AddressList: Handling selection', draft);
    if (!draft) {
      this.selectedDraft = null;
      this.selectedDraftId = null;
      return;
    }

    this.selectedDraft = draft;
    this.selectedDraftId = draft.id;

    // Se o rascunho tem _editingId, significa que é edição de registro existente
    if (draft.data._editingId) {
      this.editingAddress = {
        addressId: draft.data._editingId,
        ...draft.data,
      } as any;
    } else {
      // Draft de criação
      this.editingAddress = {
        ...draft.data,
      } as any;
    }

    this.showForm = true;
    console.log('AddressList: showForm set to true');

    // Scroll to form with delay to ensure rendering
    setTimeout(() => this.scrollToForm(), 100);
  }

  private scrollToForm() {
    if (this.formContainer && this.formContainer.nativeElement) {
      this.formContainer.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  removeDraft(draft: FormDraft, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir Rascunho',
        message: `Tem certeza que deseja excluir o rascunho <strong>"${
          draft.draftName || 'Sem nome'
        }"</strong>?`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.formDraftService.removeDraftById(draft.id);
        if (this.selectedDraftId === draft.id) {
          this.selectedDraft = null;
          this.selectedDraftId = null;
          this.closeForm();
        }
        this.toastr.info('Rascunho excluído com sucesso');
      }
    });
  }

  loadAddresses() {
    this.loading = true;
    this.addressService.getByPersonId(this.personId).subscribe({
      next: (addresses) => {
        this.addresses = this.addressService.sortAddresses(addresses);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar endereços:', err);
        this.toastr.error('Erro ao carregar endereços');
        this.loading = false;
      },
    });
  }

  onAddNew() {
    this.editingAddress = null;
    this.selectedDraft = null;
    this.selectedDraftId = null;
    this.showForm = true;

    // Scroll to form
    setTimeout(() => this.scrollToForm(), 100);
  }

  onEdit(address: Address) {
    this.editingAddress = address;
    this.showForm = true;
  }

  onDelete(address: Address) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir o endereço ${address.street}, ${address.number}?`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.addressService.delete(address.addressId!).subscribe({
          next: () => {
            this.toastr.success('Endereço excluído com sucesso');
            this.loadAddresses();
          },
          error: (err) => {
            console.error('Erro ao excluir:', err);
            this.toastr.error('Erro ao excluir endereço');
          },
        });
      }
    });
  }

  onSetMain(address: Address) {
    this.addressService.setMainAddress(address.addressId!).subscribe({
      next: () => {
        this.toastr.success('Endereço principal atualizado');
        this.loadAddresses();
      },
      error: (err) => {
        console.error('Erro ao definir principal:', err);
        this.toastr.error('Erro ao definir endereço principal');
      },
    });
  }

  onFormSubmitted() {
    this.showForm = false;
    this.editingAddress = null;
    this.loadAddresses();
  }

  onFormCancelled() {
    // Verifica se há mudanças não salvas
    if (this.addressForm?.hasUnsavedChanges()) {
      const canSave = this.addressForm.canSaveForm();
      const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
        width: '450px',
        disableClose: true,
        data: {
          canSave,
          message: canSave
            ? 'Deseja salvar as alterações antes de sair?'
            : 'Há campos obrigatórios não preenchidos. Deseja salvar um rascunho para continuar depois?',
        },
      });

      dialogRef.afterClosed().subscribe((result: string | undefined) => {
        if (!result || result === 'cancel') {
          return;
        }

        if (result === 'discard') {
          this.closeForm();
          return;
        }

        if (result === 'save' && canSave) {
          this.addressForm?.saveForm(false).subscribe((success: boolean) => {
            if (success) {
              this.closeForm();
            }
          });
          return;
        }

        // Se o resultado começa com 'draft:', extrai o nome do rascunho
        if (result.startsWith('draft:')) {
          const draftName = result.substring(6);
          this.addressForm?.saveLocalDraft(false, draftName, undefined, true);
          this.closeForm();
          return;
        }

        // Caso o retorno do diálogo seja apenas 'draft' (legado ou simplificado)
        if (result === 'draft') {
          this.addressForm?.saveLocalDraft();
          this.closeForm();
          return;
        }
      });
    } else {
      this.closeForm();
    }
  }

  private closeForm() {
    this.showForm = false;
    this.editingAddress = null;
    this.selectedDraft = null;
    this.selectedDraftId = null;
  }

  get hasMainAddress(): boolean {
    return this.addressService.hasMainAddress(this.addresses);
  }

  get addressCount(): number {
    return this.addresses.length;
  }
}
