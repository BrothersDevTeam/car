import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SideNavComponent } from './sidenav.component';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

describe('SideNavComponent', () => {
  let component: SideNavComponent;
  let fixture: ComponentFixture<SideNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SideNavComponent,
        RouterModule.forRoot([]) // Configuração de rota vazia para os testes
      ],
      providers: [provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SideNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
