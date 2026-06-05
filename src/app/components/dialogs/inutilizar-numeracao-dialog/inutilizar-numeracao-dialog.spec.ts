import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InutilizarNumeracaoDialog } from './inutilizar-numeracao-dialog';

describe('InutilizarNumeracaoDialog', () => {
  let component: InutilizarNumeracaoDialog;
  let fixture: ComponentFixture<InutilizarNumeracaoDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InutilizarNumeracaoDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InutilizarNumeracaoDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
