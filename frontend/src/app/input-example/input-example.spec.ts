import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputExample } from './input-example';

describe('InputExample', () => {
  let component: InputExample;
  let fixture: ComponentFixture<InputExample>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InputExample],
    }).compileComponents();

    fixture = TestBed.createComponent(InputExample);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
