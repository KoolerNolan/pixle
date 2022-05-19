import {AfterViewInit, Component, ElementRef, Inject, OnInit, ViewChild} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {WINDOW} from './window-injection.token';
import {PixSideMenuComponent} from './pix-side-menu/pix-side-menu.component';
import {faGear, faXmark} from '@fortawesome/free-solid-svg-icons';
import {IconDefinition} from '@fortawesome/free-brands-svg-icons';

export const STYLESHEETS_PATH: string = '../../stylesheets/css/';

const hasMatchMedia = typeof window.matchMedia !== 'undefined';
/**
 * Determine if device is touch-capable
 * true - device is touch-capable
 * false - device is not touch-capable
 * null - unable to determine touch capability
 *
 * @return {null|boolean}
 */
const hasTouch = () => {
  if (hasMatchMedia) {
    return window.matchMedia('(hover: none)').matches;
  }
  return null;
};

const COOLDOWN_TOUCH: number = 75;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['../stylesheets/css/app.component.min.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  iconOpenSideMenu: IconDefinition = faGear;
  iconCloseSideMenu: IconDefinition = faXmark;
  isTouchTimer: any;
  @ViewChild(PixSideMenuComponent) private pixSideMenuComponent!: PixSideMenuComponent;
  @ViewChild('toggle_side_menu_btn') private toggle_side_menu_btn!: ElementRef;

  constructor(@Inject(DOCUMENT) private document: Document, @Inject(WINDOW) private readonly window: Window) {
    this.addViewportHeightProperty();
  }

  ngOnInit() {
    // Add several event listeners, which help detect touch input
    this.window.addEventListener('touchstart', this.addTouchClass, false);
    ['mouseover', 'touchend', 'touchcancel'].forEach(event => {
      this.window.addEventListener(event, this.removeTouchClass, false);
    });
    // Get the stored theme data, if available, and "restore" the previous settings
    const PREVIOUS_THEME: string | null = localStorage.getItem('last_theme');
    if (PREVIOUS_THEME != null) {
      this.document.body.dataset['theme'] = PREVIOUS_THEME;
    }
  }

  ngAfterViewInit() {
    // Calculate viewport height --> alternative to css vh unit
    this.window.addEventListener('resize', () => {
      this.addViewportHeightProperty();
    });
  }

  /**
   * Toggle (open or close) the side menu
   */
  public toggleSideMenu(): void {
    let side_menu_element: HTMLElement = this.pixSideMenuComponent.side_menu.nativeElement;
    let toggle_side_menu_element: HTMLElement = this.toggle_side_menu_btn.nativeElement;
    let show_class: string = 'toggle';

    if (this.pixSideMenuComponent.active) {
      this.pixSideMenuComponent.closeHTMLElement(side_menu_element);
      if (toggle_side_menu_element.classList.contains(show_class)) {
        toggle_side_menu_element.classList.remove(show_class);
      }
    } else {
      this.pixSideMenuComponent.openHTMLElement(side_menu_element);
      if (!toggle_side_menu_element.classList.contains(show_class)) {
        toggle_side_menu_element.classList.add(show_class);
      }
    }
    this.pixSideMenuComponent.active = !this.pixSideMenuComponent.active;
  }

  /**
   * Add a css property / variable which will "replace" the css unit vh
   * Using this variable is much more reliable and mobile-friendly
   *
   * @private
   */
  private addViewportHeightProperty(): void {
    let vh = this.window.innerHeight * 0.01;
    this.document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  /**
   * Add a touch indicator class to the body element
   *
   * @private
   */
  private addTouchClass(): void {
    clearTimeout(this.isTouchTimer);
    let body_element: HTMLElement = this.document.body;
    if (!hasTouch() || body_element.classList.contains('startTouch')) return;
    body_element.classList.add('startTouch');
  }

  /**
   * Remove the touch indicator class from the body element
   *
   * @private
   */
  private removeTouchClass(): void {
    this.isTouchTimer = setTimeout(() => {
      let body_element: HTMLElement = this.document.body;
      if (!body_element.classList.contains('startTouch')) return;
      body_element.classList.remove('startTouch');
    }, COOLDOWN_TOUCH);
  }
}
