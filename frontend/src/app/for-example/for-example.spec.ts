import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForExample } from './for-example';

describe('ForExample', () => {
  let component: ForExample;
  let fixture: ComponentFixture<ForExample>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ForExample],
    }).compileComponents();

    fixture = TestBed.createComponent(ForExample);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
