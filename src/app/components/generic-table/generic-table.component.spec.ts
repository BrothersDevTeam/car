import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Person } from '@interfaces/person';
import { GenericTableComponent } from './generic-table.component';

describe('GenericTableComponent', () => {
  let component: GenericTableComponent<Person>;
  let fixture: ComponentFixture<GenericTableComponent<Person>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericTableComponent<Person>);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
