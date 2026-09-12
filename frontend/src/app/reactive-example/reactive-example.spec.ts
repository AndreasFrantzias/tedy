import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactiveExample } from './reactive-example';

describe('ReactiveExample', () => {
  let component: ReactiveExample;
  let fixture: ComponentFixture<ReactiveExample>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReactiveExample],
    }).compileComponents();

    fixture = TestBed.createComponent(ReactiveExample);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
