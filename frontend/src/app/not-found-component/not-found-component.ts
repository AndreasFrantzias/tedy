import { Component } from '@angular/core';

//not-found page for users who try to access a page that doesn't exist
@Component({
  selector: 'app-not-found-component',
  standalone: false,
  templateUrl: './not-found-component.html',
  styleUrl: './not-found-component.css',
})
export class NotFoundComponent {}
