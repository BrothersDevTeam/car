import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancelNfeDialog } from './cancel-nfe-dialog';

describe('CancelNfeDialog', () => {
  let component: CancelNfeDialog;
  let fixture: ComponentFixture<CancelNfeDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CancelNfeDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CancelNfeDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
