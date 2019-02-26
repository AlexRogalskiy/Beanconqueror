/**Core**/
import {Component} from '@angular/core';
/**Ionic**/
import {ViewController} from 'ionic-angular';
/**Services**/

/**Classes**/

import {Mill} from "../../../classes/mill/mill";
import {UIMillStorage} from "../../../services/uiMillStorage";

@Component({
  templateUrl: 'mill-add.html',
})
export class MillAddModal {

  public data:Mill = new Mill();
  constructor(private viewCtrl: ViewController, private uiMillStorage:UIMillStorage) {

  }

  public addMill(form) {

    if (form.valid) {
      this.__addMill();
    }
  }

  public __addMill(){
    this.uiMillStorage.add(this.data);
    this.dismiss();
  }



  dismiss() {
    this.viewCtrl.dismiss("", null, {animate: false});
  }


}