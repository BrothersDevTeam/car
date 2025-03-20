import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NfeComponent } from './nfe.component';

describe('NfeComponent', () => {
  let component: NfeComponent;
  let fixture: ComponentFixture<NfeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NfeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NfeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
