import { FormControl } from '@angular/forms';

export interface LoginResponse {
  id: string;
  fullName: string;
  role: string;
  token: string;
}

export interface LoginForm {
  username: FormControl;
  password: FormControl;
}
