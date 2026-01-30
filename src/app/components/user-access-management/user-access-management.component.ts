import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { PersonService } from '@services/person.service';
import { AccessDataFormComponent } from '../access-data-form/access-data-form.component';

@Component({
  selector: 'app-user-access-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AccessDataFormComponent, // Added
  ],
  templateUrl: './user-access-management.component.html',
  styleUrls: ['./user-access-management.component.scss'],
})
export class UserAccessManagementComponent {
  @Input() personId!: string;
  @Input() hasUser: boolean = false;
  @Input() existingUsername?: string; // Optional: show current username if available
  @Output() accessUpdated = new EventEmitter<void>();

  userForm: FormGroup;
  isFormVisible = false;
  isLoading = false;
  submitted = false; // Added for validation

  constructor(
    private fb: FormBuilder,
    private personService: PersonService,
    private toastr: ToastrService
  ) {
    this.userForm = this.fb.group(
      {
        username: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]], // Added
        roleName: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    ); // Added validator
  }

  // Custom validator for password match
  private passwordMatchValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Clear specific error if it exists but preserve others
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(
          Object.keys(errors).length > 0 ? errors : null
        );
      }
    }

    return null;
  }

  toggleForm() {
    this.isFormVisible = !this.isFormVisible;
    if (this.isFormVisible) {
      this.userForm.reset();
    }
  }

  onSubmit() {
    this.submitted = true; // Mark as submitted to show errors

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formData = {
      ...this.userForm.value,
      personId: this.personId, // DTO requires personId in body too
      password: this.userForm.value.password, // Ensure password is correct
    };

    console.log('Creating user for person:', this.personId, formData);

    this.personService.createEmployeeUser(this.personId, formData).subscribe({
      next: () => {
        this.toastr.success('Acesso criado com sucesso!');
        this.isLoading = false;
        this.isFormVisible = false;
        this.hasUser = true; // Optimistic update
        this.accessUpdated.emit();
      },
      error: (err: any) => {
        console.error('Error creating user:', err);
        const msg = err.error || 'Erro ao criar usuário.';
        this.toastr.error(typeof msg === 'string' ? msg : 'Erro desconhecido');
        this.isLoading = false;
      },
    });
  }
}
