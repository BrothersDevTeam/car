import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { PrimarySelectComponent } from './primary-select.component';
import { AuthService } from '@services/auth/auth.service';

describe('PrimarySelectComponent', () => {
  let component: PrimarySelectComponent;
  let fixture: ComponentFixture<PrimarySelectComponent>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getUserStoreId', 'isMaster', 'isStoreAdmin']);
    const elementRefMock = new ElementRef(document.createElement('div'));

    await TestBed.configureTestingModule({
      imports: [PrimarySelectComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ElementRef, useValue: elementRefMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrimarySelectComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
