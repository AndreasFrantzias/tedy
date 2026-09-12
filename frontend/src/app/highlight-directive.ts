import { Directive, HostBinding, HostListener } from '@angular/core';
@Directive({
  selector: '[appHighlight]',
  standalone: false
})
export class HighlightDirective {
  @HostBinding('style.background-color') bg = '';
  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.bg = '#fff3cd';
  }
  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.bg = '';
  }
}
