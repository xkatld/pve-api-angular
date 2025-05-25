import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http'; // 导入 HttpClientModule
import { FormsModule } from '@angular/forms'; // 导入 FormsModule

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule, // 添加到 imports
    FormsModule       // 添加到 imports
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
