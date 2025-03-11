import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';

import { PrimaryInputComponent } from './primary-input.component';
import { provideNgxMask } from 'ngx-mask';

describe('PrimaryInputComponent', () => {
  let component: PrimaryInputComponent;
  let fixture: ComponentFixture<PrimaryInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, PrimaryInputComponent],
      declarations: [],
      providers: [provideNgxMask()],
    }).compileComponents();

    fixture = TestBed.createComponent(PrimaryInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
