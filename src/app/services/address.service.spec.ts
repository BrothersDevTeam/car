import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AddressService } from './address.service';
import { Address, CreateAddress, UpdateAddress } from '@interfaces/address';
import { AddressType } from '../enums/addressTypes';

/**
 * Suite de testes para AddressService.
 * 
 * Estes testes verificam:
 * - Chamadas corretas aos endpoints da API
 * - Construção adequada de query parameters
 * - Tratamento de respostas
 * - Métodos helpers utilitários
 * 
 * PADRÃO AAA (Arrange, Act, Assert):
 * - Arrange: configurar dados de teste
 * - Act: executar a ação
 * - Assert: verificar o resultado
 */
describe('AddressService', () => {
  let service: AddressService;
  let httpMock: HttpTestingController;

  // beforeEach: executado antes de cada teste
  // Configura o ambiente de teste limpo para cada caso
  beforeEach(() => {
    TestBed.configureTestingModule({
      // HttpClientTestingModule: mock do HttpClient para testes
      imports: [HttpClientTestingModule],
      providers: [AddressService]
    });
    
    // Injeta as dependências
    service = TestBed.inject(AddressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // afterEach: executado após cada teste
  // Verifica se não há requisições pendentes (boa prática)
  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Teste básico: verifica se o service foi criado corretamente
   */
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * Testes do método create()
   */
  describe('create', () => {
    it('should create a new address via POST', () => {
      // Arrange: prepara os dados de teste
      const newAddress: CreateAddress = {
        personId: '123',
        addressType: AddressType.RESIDENCIAL,
        cep: '01310100',
        street: 'Av. Paulista',
        number: '1578',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        active: true,
        mainAddress: true
      };

      const mockResponse: Address = {
        ...newAddress,
        addressId: 'abc-123',
        storeId: 'store-456',
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      };

      // Act: executa o método
      service.create(newAddress).subscribe(response => {
        // Assert: verifica o resultado
        expect(response).toEqual(mockResponse);
        expect(response.addressId).toBe('abc-123');
      });

      // Verifica se a requisição HTTP foi feita corretamente
      const req = httpMock.expectOne('/api/addresses');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newAddress);

      // Simula a resposta do backend
      req.flush(mockResponse);
    });
  });

  /**
   * Testes do método update()
   */
  describe('update', () => {
    it('should update an existing address via PUT', () => {
      const addressId = 'abc-123';
      const updateData: UpdateAddress = {
        addressType: AddressType.COMERCIAL,
        cep: '01310100',
        street: 'Av. Paulista',
        number: '2000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        active: true
      };

      const mockResponse: Address = {
        ...updateData,
        addressId,
        personId: '123',
        storeId: 'store-456',
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T11:00:00Z'
      };

      service.update(addressId, updateData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`/api/addresses/${addressId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockResponse);
    });
  });

  /**
   * Testes do método delete()
   */
  describe('delete', () => {
    it('should delete an address via DELETE', () => {
      const addressId = 'abc-123';

      service.delete(addressId).subscribe(response => {
        expect(response).toBeUndefined();
      });

      const req = httpMock.expectOne(`/api/addresses/${addressId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  /**
   * Testes do método getById()
   */
  describe('getById', () => {
    it('should get address by ID via GET', () => {
      const addressId = 'abc-123';
      const mockAddress: Address = {
        addressId,
        personId: '123',
        storeId: 'store-456',
        addressType: AddressType.RESIDENCIAL,
        cep: '01310100',
        street: 'Av. Paulista',
        number: '1578',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        active: true,
        mainAddress: true,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      };

      service.getById(addressId).subscribe(response => {
        expect(response).toEqual(mockAddress);
      });

      const req = httpMock.expectOne(`/api/addresses/${addressId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAddress);
    });
  });

  /**
   * Testes do método getByPersonId()
   */
  describe('getByPersonId', () => {
    it('should get all addresses for a person via GET', () => {
      const personId = '123';
      const mockAddresses: Address[] = [
        {
          addressId: 'addr-1',
          personId,
          storeId: 'store-456',
          addressType: AddressType.RESIDENCIAL,
          cep: '01310100',
          street: 'Av. Paulista',
          number: '1578',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          active: true,
          mainAddress: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        },
        {
          addressId: 'addr-2',
          personId,
          storeId: 'store-456',
          addressType: AddressType.COMERCIAL,
          cep: '01311000',
          street: 'Rua Augusta',
          number: '100',
          neighborhood: 'Consolação',
          city: 'São Paulo',
          state: 'SP',
          active: true,
          mainAddress: false,
          createdAt: '2025-01-01T11:00:00Z',
          updatedAt: '2025-01-01T11:00:00Z'
        }
      ];

      service.getByPersonId(personId).subscribe(response => {
        expect(response.length).toBe(2);
        expect(response).toEqual(mockAddresses);
      });

      const req = httpMock.expectOne(`/api/addresses/person/${personId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAddresses);
    });
  });

  /**
   * Testes do método setMainAddress()
   */
  describe('setMainAddress', () => {
    it('should set address as main via PATCH', () => {
      const addressId = 'abc-123';
      const mockResponse: Address = {
        addressId,
        personId: '123',
        storeId: 'store-456',
        addressType: AddressType.RESIDENCIAL,
        cep: '01310100',
        street: 'Av. Paulista',
        number: '1578',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        active: true,
        mainAddress: true,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z'
      };

      service.setMainAddress(addressId).subscribe(response => {
        expect(response.mainAddress).toBe(true);
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`/api/addresses/${addressId}/set-main`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });
  });

  /**
   * Testes do método getAll() com filtros
   */
  describe('getAll', () => {
    it('should get paginated addresses with filters via GET', () => {
      const mockResponse = {
        content: [],
        page: {
          size: 10,
          totalElements: 0,
          totalPages: 0,
          number: 0
        }
      };

      service.getAll(0, 10, {
        addressType: AddressType.RESIDENCIAL,
        state: 'SP',
        city: 'São Paulo'
      }).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(req =>
        req.url === '/api/addresses' &&
        req.params.get('page') === '0' &&
        req.params.get('size') === '10' &&
        req.params.get('addressType') === 'RESIDENCIAL' &&
        req.params.get('state') === 'SP' &&
        req.params.get('city') === 'São Paulo'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  /**
   * Testes dos métodos helpers
   */
  describe('Helper Methods', () => {
    describe('cleanCep', () => {
      it('should remove all non-digit characters from CEP', () => {
        expect(service.cleanCep('01310-100')).toBe('01310100');
        expect(service.cleanCep('01.310-100')).toBe('01310100');
        expect(service.cleanCep('01310100')).toBe('01310100');
        expect(service.cleanCep('abc01310100xyz')).toBe('01310100');
      });

      it('should return empty string for empty input', () => {
        expect(service.cleanCep('')).toBe('');
      });
    });

    describe('formatCep', () => {
      it('should format CEP with hyphen', () => {
        expect(service.formatCep('01310100')).toBe('01310-100');
      });

      it('should handle already formatted CEP', () => {
        expect(service.formatCep('01310-100')).toBe('01310-100');
      });

      it('should return unformatted for invalid length', () => {
        expect(service.formatCep('123')).toBe('123');
        expect(service.formatCep('123456789')).toBe('123456789');
      });
    });

    describe('isValidCep', () => {
      it('should validate correct CEP formats', () => {
        expect(service.isValidCep('01310100')).toBe(true);
        expect(service.isValidCep('01310-100')).toBe(true);
      });

      it('should invalidate incorrect CEP formats', () => {
        expect(service.isValidCep('123')).toBe(false);
        expect(service.isValidCep('123456789')).toBe(false);
        expect(service.isValidCep('')).toBe(false);
        expect(service.isValidCep('abcdefgh')).toBe(false);
      });
    });

    describe('sortAddresses', () => {
      it('should sort addresses with main address first', () => {
        const addresses: Address[] = [
          {
            addressId: 'addr-1',
            personId: '123',
            addressType: AddressType.COMERCIAL,
            cep: '01310100',
            street: 'Rua 1',
            neighborhood: 'Bairro 1',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: false,
            createdAt: '2025-01-01T10:00:00Z'
          },
          {
            addressId: 'addr-2',
            personId: '123',
            addressType: AddressType.RESIDENCIAL,
            cep: '01311000',
            street: 'Rua 2',
            neighborhood: 'Bairro 2',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: true,
            createdAt: '2025-01-01T11:00:00Z'
          }
        ];

        const sorted = service.sortAddresses(addresses);
        expect(sorted[0].mainAddress).toBe(true);
        expect(sorted[0].addressId).toBe('addr-2');
      });

      it('should sort by creation date when no main address', () => {
        const addresses: Address[] = [
          {
            addressId: 'addr-1',
            personId: '123',
            addressType: AddressType.COMERCIAL,
            cep: '01310100',
            street: 'Rua 1',
            neighborhood: 'Bairro 1',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: false,
            createdAt: '2025-01-01T10:00:00Z'
          },
          {
            addressId: 'addr-2',
            personId: '123',
            addressType: AddressType.RESIDENCIAL,
            cep: '01311000',
            street: 'Rua 2',
            neighborhood: 'Bairro 2',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: false,
            createdAt: '2025-01-01T12:00:00Z'
          }
        ];

        const sorted = service.sortAddresses(addresses);
        // Mais recente primeiro
        expect(sorted[0].addressId).toBe('addr-2');
      });
    });

    describe('hasMainAddress', () => {
      it('should return true if there is a main address', () => {
        const addresses: Address[] = [
          {
            addressId: 'addr-1',
            personId: '123',
            addressType: AddressType.RESIDENCIAL,
            cep: '01310100',
            street: 'Rua 1',
            neighborhood: 'Bairro 1',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: true
          }
        ];

        expect(service.hasMainAddress(addresses)).toBe(true);
      });

      it('should return false if there is no main address', () => {
        const addresses: Address[] = [
          {
            addressId: 'addr-1',
            personId: '123',
            addressType: AddressType.RESIDENCIAL,
            cep: '01310100',
            street: 'Rua 1',
            neighborhood: 'Bairro 1',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: false
          }
        ];

        expect(service.hasMainAddress(addresses)).toBe(false);
      });
    });

    describe('getMainAddress', () => {
      it('should return the main address', () => {
        const addresses: Address[] = [
          {
            addressId: 'addr-1',
            personId: '123',
            addressType: AddressType.COMERCIAL,
            cep: '01310100',
            street: 'Rua 1',
            neighborhood: 'Bairro 1',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: false
          },
          {
            addressId: 'addr-2',
            personId: '123',
            addressType: AddressType.RESIDENCIAL,
            cep: '01311000',
            street: 'Rua 2',
            neighborhood: 'Bairro 2',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: true
          }
        ];

        const main = service.getMainAddress(addresses);
        expect(main).toBeDefined();
        expect(main?.addressId).toBe('addr-2');
      });

      it('should return undefined if no main address', () => {
        const addresses: Address[] = [
          {
            addressId: 'addr-1',
            personId: '123',
            addressType: AddressType.RESIDENCIAL,
            cep: '01310100',
            street: 'Rua 1',
            neighborhood: 'Bairro 1',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: false
          }
        ];

        const main = service.getMainAddress(addresses);
        expect(main).toBeUndefined();
      });
    });

    describe('countByType', () => {
      it('should count addresses by type', () => {
        const addresses: Address[] = [
          {
            addressId: 'addr-1',
            personId: '123',
            addressType: AddressType.RESIDENCIAL,
            cep: '01310100',
            street: 'Rua 1',
            neighborhood: 'Bairro 1',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: true
          },
          {
            addressId: 'addr-2',
            personId: '123',
            addressType: AddressType.RESIDENCIAL,
            cep: '01311000',
            street: 'Rua 2',
            neighborhood: 'Bairro 2',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: false
          },
          {
            addressId: 'addr-3',
            personId: '123',
            addressType: AddressType.COMERCIAL,
            cep: '01312000',
            street: 'Rua 3',
            neighborhood: 'Bairro 3',
            city: 'São Paulo',
            state: 'SP',
            active: true,
            mainAddress: false
          }
        ];

        const count = service.countByType(addresses);
        expect(count['RESIDENCIAL']).toBe(2);
        expect(count['COMERCIAL']).toBe(1);
      });
    });
  });
});
