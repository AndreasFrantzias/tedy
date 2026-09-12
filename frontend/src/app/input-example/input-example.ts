import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../model/User';

@Component({
  selector: 'app-input-example',
  standalone: false,
  templateUrl: './input-example.html',
  styleUrl: './input-example.css',
})
export class InputExample {
  @Input() user?: User;

  @Output() deleted = new EventEmitter<string>();

  deleteCurrent(): void {
    if (this.user) {
      this.deleted.emit(this.user.username);
      this.user = undefined;
    }
  }
}
