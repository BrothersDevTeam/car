import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessDoneTableComponent } from './business-done-table.component';

describe('BusinessDoneTableComponent', () => {
  let component: BusinessDoneTableComponent;
  let fixture: ComponentFixture<BusinessDoneTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessDoneTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessDoneTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
