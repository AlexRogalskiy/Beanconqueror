import {Component, EventEmitter, Input, OnInit, Output, SimpleChange, ViewChild} from '@angular/core';
import {Brew} from '../../classes/brew/brew';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {ModalController} from '@ionic/angular';
import {BREW_ACTION} from '../../enums/brews/brewAction';
import {BrewPopoverActionsComponent} from '../../app/brew/brew-popover-actions/brew-popover-actions.component';
import {Bean} from '../../classes/bean/bean';
import {Preparation} from '../../classes/preparation/preparation';
import {Mill} from '../../classes/mill/mill';
import {BREW_QUANTITY_TYPES_ENUM} from '../../enums/brews/brewQuantityTypes';
import {PREPARATION_STYLE_TYPE} from '../../enums/preparations/preparationStyleTypes';
import {NgxStarsComponent} from 'ngx-stars';
import {BrewEditComponent} from '../../app/brew/brew-edit/brew-edit.component';
import {BrewAddComponent} from '../../app/brew/brew-add/brew-add.component';
import {BrewDetailComponent} from '../../app/brew/brew-detail/brew-detail.component';
import {BrewCuppingComponent} from '../../app/brew/brew-cupping/brew-cupping.component';
import {UIBrewHelper} from '../../services/uiBrewHelper';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIToast} from '../../services/uiToast';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UIAlert} from '../../services/uiAlert';
import {UIImage} from '../../services/uiImage';
import {UIHelper} from '../../services/uiHelper';
import BREW_TRACKING from '../../data/tracking/brewTracking';
import {Settings} from '../../classes/settings/settings';

@Component({
  selector: 'brew-information',
  templateUrl: './brew-information.component.html',
  styleUrls: ['./brew-information.component.scss'],

})
export class BrewInformationComponent implements OnInit {
  @Input() public brew: Brew;
  @Input() public layout:string = 'brew';

  @ViewChild('brewStars', {read: NgxStarsComponent, static: false}) public brewStars: NgxStarsComponent;

  @Output() public brewAction: EventEmitter<any> = new EventEmitter();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;

  public bean: Bean;
  public preparation: Preparation;
  public mill: Mill;
  public brewQuantityEnum = BREW_QUANTITY_TYPES_ENUM;


  public settings: Settings = null;

  constructor(private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiBrewHelper: UIBrewHelper,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiToast: UIToast,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiAlert: UIAlert,
              private readonly uiImage: UIImage,
              private readonly modalCtrl: ModalController,
              private readonly uiHelper: UIHelper) {

  }

  public ngOnInit() {
    if (this.brew) {
      this.settings =  this.uiSettingsStorage.getSettings();
      this.bean = this.brew.getBean();
      this.preparation = this.brew.getPreparation();
      this.mill = this.brew.getMill();
    }

  }

  public hasCustomRatingRange(): boolean {
    if (this.settings) {
      return this.settings.brew_rating > 5;
    }
    return false;
  }

  public getCustomMaxRating(): number {
    if (this.settings) {
      return this.settings.brew_rating;
    }
    return 5;
  }

  public ngOnChanges(changes: SimpleChange) {
    // changes.prop contains the old and the new value...

      this.resetRenderingRating();


  }
  private resetRenderingRating() {
    if (this.brewStars && this.brew.rating > 0) {
      this.brewStars.setRating(this.brew.rating);
    }
  }

  public async showBrew() {
    await this.detailBrew();
  }

  public async showBrewActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.POPOVER_ACTIONS);
    const popover = await this.modalCtrl.create({
      component: BrewPopoverActionsComponent,

      componentProps: {brew: this.brew},
      id:'brew-popover-actions',
      cssClass: 'popover-actions',
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalBrewAction(data.role as BREW_ACTION);
      this.brewAction.emit([data.role as BREW_ACTION, this.brew]);
    }
  }


  private async internalBrewAction(action: BREW_ACTION) {
    switch (action) {
      case BREW_ACTION.REPEAT:
        await this.repeatBrew();
        break;
      case BREW_ACTION.DETAIL:
        await this.detailBrew();
        break;
      case BREW_ACTION.EDIT:
        await this.editBrew();
        break;
      case BREW_ACTION.DELETE:
        try {
          await this.deleteBrew();
        }catch (ex) {}
        break;
      case BREW_ACTION.PHOTO_GALLERY:
        await this.viewPhotos();
        break;
      case BREW_ACTION.CUPPING:
        await this.cupBrew();
        break;
      case BREW_ACTION.SHOW_MAP_COORDINATES:
        await this.showMapCoordinates();
        break;
      case BREW_ACTION.FAST_REPEAT:
        await this.fastRepeatBrew();
        break;
      case BREW_ACTION.TOGGLE_FAVOURITE:
        this.toggleFavourite();
        break;
      default:
        break;
    }
  }

  public async fastRepeatBrew() {
    if (this.uiBrewHelper.canBrewIfNotShowMessage()) {
      this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.FAST_REPEAT);
      const repeatBrew = this.uiBrewHelper.repeatBrew(this.brew);
      this.uiBrewStorage.add(repeatBrew);
      this.uiToast.showInfoToast('TOAST_BREW_REPEATED_SUCCESSFULLY');

    }
  }

  public async longPressEditBrew(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.editBrew();
    this.brewAction.emit([BREW_ACTION.EDIT, this.brew]);
  }
  public async editBrew() {
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.EDIT);
    const modal = await this.modalCtrl.create({component: BrewEditComponent, id:'brew-edit', componentProps: {brew: this.brew}});
    await modal.present();
    await modal.onWillDismiss();

  }
  public async repeatBrew() {
    if (this.uiBrewHelper.canBrewIfNotShowMessage()) {
      this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.REPEAT);
      const modal = await this.modalCtrl.create({component: BrewAddComponent, id: 'brew-add', componentProps: {brew_template: this.brew}});
      await modal.present();
      await modal.onWillDismiss();

    }
  }

  public toggleFavourite() {
    if (!this.brew.favourite) {
      this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.ADD_FAVOURITE);
      this.uiToast.showInfoToast('TOAST_BREW_FAVOURITE_ADDED');
      this.brew.favourite = true;
    } else {
      this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.REMOVE_FAVOURITE);
      this.brew.favourite = false;
      this.uiToast.showInfoToast('TOAST_BREW_FAVOURITE_REMOVED');
    }
    this.uiBrewStorage.update(this.brew);
  }


  public async detailBrew() {
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.DETAIL);
    const modal = await this.modalCtrl.create({component: BrewDetailComponent, id:'brew-detail', componentProps: {brew: this.brew}});
    await modal.present();
    await modal.onWillDismiss();

  }

  public async cupBrew() {
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.CUPPING);
    const modal = await this.modalCtrl.create({component: BrewCuppingComponent, id:'brew-cup', componentProps: {brew: this.brew}});
    await modal.present();
    await modal.onWillDismiss();

  }

  public async showMapCoordinates() {
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.SHOW_MAP);
    this.uiHelper.openExternalWebpage(this.brew.getCoordinateMapLink());
  }


  public async viewPhotos() {
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.PHOTO_VIEW);
    await this.uiImage.viewPhotos(this.brew);
  }

  public deleteBrew(): Promise<any> {

   return new Promise(async (resolve,reject) => {
      this.uiAlert.showConfirm('DELETE_BREW_QUESTION', 'SURE_QUESTION', true).then(async () => {
          // Yes
          this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.DELETE);
          await this.__deleteBrew();
          this.uiToast.showInfoToast('TOAST_BREW_DELETED_SUCCESSFULLY');
          resolve();
        },
        () => {
          // No
          reject();
        });
      }
   );
  }

  private async __deleteBrew() {
    await this.uiBrewStorage.removeByObject(this.brew);
  }


}
