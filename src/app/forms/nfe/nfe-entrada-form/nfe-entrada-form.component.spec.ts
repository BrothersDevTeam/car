import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NfeEntradaFormComponent } from './nfe-entrada-form.component';

describe('NfeEntradaComponent', () => {
  let component: NfeEntradaFormComponent;
  let fixture: ComponentFixture<NfeEntradaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NfeEntradaFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NfeEntradaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
