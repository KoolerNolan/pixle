import {AfterViewInit, Component, ElementRef, Inject, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {HelperFunctionsService} from '@abstract/services/helper-functions.service';
import {DOCUMENT} from '@angular/common';
import {faGear, faXmark, IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {SideMenuComponent} from '@typescript/side-menu/side-menu.component';
import {IPopUp} from '@interface/popup-message.interface';
import {PopupMessageComponent} from '@typescript/popup-message/popup-message.component';

export const STYLESHEETS_PATH: string = '../../stylesheets/css/';

// Cookie notification
const COOKIE_NOTIF_MSG: IPopUp = {
  headline: 'Cookie alert!',
  subline: '',
  message_body: 'We are required to inform you about the usage of cookies on our website. These are required' +
    ' and used in order to save applied settings. Closing this notification means you agree with the usage of cookies.'
};

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['../stylesheets/css/app.component.min.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  cookie_consent: boolean = false;
  iconOpenSideMenu: IconDefinition = faGear;
  iconCloseSideMenu: IconDefinition = faXmark;
  @ViewChild(SideMenuComponent) private sideMenuComponent!: SideMenuComponent;
  @ViewChild('cookie_alert') private cookie_alert!: PopupMessageComponent;
  @ViewChild('cookie_alert_html') private cookie_alert_html!: ElementRef;
  @ViewChild('toggle_side_menu_btn') private toggle_side_menu_btn!: ElementRef;

  constructor(@Inject(DOCUMENT) private document: Document) {
    HelperFunctionsService.cookie_consent.subscribe(value => {
      this.cookie_consent = value;
    });
  }

  ngOnInit() {
    // Check if the consent to the cookie usage has been given
    let cookie_consent_given: string | null = HelperFunctionsService.getRawCookie('cookie_consent');
    let cookie_consent_bool: boolean = false;
    if (cookie_consent_given != null) cookie_consent_bool = JSON.parse(cookie_consent_given.toLowerCase());
    HelperFunctionsService.cookie_consent.next(cookie_consent_bool);
    // Get the stored theme data, if available, and "restore" the previous settings
    let previous_theme: string | null = HelperFunctionsService.getCookie('last_theme');
    if (previous_theme != null) {
      this.document.body.dataset['theme'] = previous_theme;
    }
  }

  ngAfterViewInit() {
    if (!this.cookie_consent) this.sendCookieAlert(COOKIE_NOTIF_MSG);
  }

  /**
   * Receive the emitted event which tells the game component if a popup has been closed
   *
   * @param paket
   */
  public receivePopupHasBeenClosed(paket: boolean = false): void {
    this.closeCookieAlert();
    HelperFunctionsService.cookie_consent.next(paket);
    HelperFunctionsService.createCookie('cookie_consent', String(paket));
  }

  /**
   * Open and show the user the cookie alert
   *
   * @param msg_object
   */
  public sendCookieAlert(msg_object: IPopUp): void {
    let popup_msg: PopupMessageComponent = this.cookie_alert;
    popup_msg.writeNewMessage(msg_object);
    popup_msg.openPopup();
    this.openCookieAlert();
  }

  /**
   * Toggle (open or close) the side menu
   */
  public toggleSideMenu(): void {
    let side_menu_element: HTMLElement = this.sideMenuComponent.side_menu.nativeElement;
    let toggle_side_menu_element: HTMLElement = this.toggle_side_menu_btn.nativeElement;
    let show_class: string = 'toggle';

    if (this.sideMenuComponent.active) {
      this.sideMenuComponent.addClassToHTMLElement(side_menu_element, 'close');
      if (toggle_side_menu_element.classList.contains(show_class)) {
        toggle_side_menu_element.classList.remove(show_class);
      }
    } else {
      this.sideMenuComponent.removeClassFromHTMLElement(side_menu_element, 'close');
      if (!toggle_side_menu_element.classList.contains(show_class)) {
        toggle_side_menu_element.classList.add(show_class);
      }
    }
    this.sideMenuComponent.active = !this.sideMenuComponent.active;
  }

  /**
   * Open the cookie alert on the landing page
   *
   * @private
   */
  private openCookieAlert(): void {
    let element: HTMLElement = this.cookie_alert_html.nativeElement;
    if (!element.classList.contains('close')) return;
    element.classList.remove('close');
  }

  /**
   * Close the cookie alert on the landing page
   *
   * @private
   */
  private closeCookieAlert(): void {
    let element: HTMLElement = this.cookie_alert_html.nativeElement;
    if (element.classList.contains('close')) return;
    element.classList.add('close');
  }
}
