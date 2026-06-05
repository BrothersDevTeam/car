import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CceNfeDialog } from './cce-nfe-dialog';

describe('CceNfeDialog', () => {
  let component: CceNfeDialog;
  let fixture: ComponentFixture<CceNfeDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CceNfeDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CceNfeDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
