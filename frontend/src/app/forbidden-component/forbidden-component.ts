import { Component } from '@angular/core';

//forbidden page for users who try to access a page they are not authorized to view
@Component({
  selector: 'app-forbidden-component',
  standalone: false,
  templateUrl: './forbidden-component.html',
  styleUrl: './forbidden-component.css',
})
export class ForbiddenComponent {}
