import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NfeSaidaFormComponent } from './nfe-saida-form.component';

describe('NfeSaidaFormComponent', () => {
  let component: NfeSaidaFormComponent;
  let fixture: ComponentFixture<NfeSaidaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NfeSaidaFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NfeSaidaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
