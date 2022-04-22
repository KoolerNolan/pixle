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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['../stylesheets/css/app.component.min.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild(PixSideMenuComponent) private pixSideMenuComponent!: PixSideMenuComponent;
  @ViewChild('toggle_side_menu_btn') private toggle_side_menu_btn!: ElementRef;

  iconOpenSideMenu: IconDefinition = faGear;
  iconCloseSideMenu: IconDefinition = faXmark;
  isTouchTimer: any;

  constructor(@Inject(DOCUMENT) private document: Document, @Inject(WINDOW) private readonly window: Window) {
    this.addViewportHeightProperty();
  }

  ngOnInit() {
    // Add several event listeners, which help detect touch input
    this.window.addEventListener('touchstart', this.addTouchClass, false);
    ['mouseover', 'touchend', 'touchcancel'].forEach(event => {
      this.window.addEventListener(event, this.removeTouchClass, false);
    });
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
    let openIconButton: HTMLElement = this.toggle_side_menu_btn.nativeElement.querySelector('span.open-icon');
    let closeIconButton: HTMLElement = this.toggle_side_menu_btn.nativeElement.querySelector('span.close-icon');
    let show_class: string = 'show';

    if (this.pixSideMenuComponent.active) {
      this.pixSideMenuComponent.closeSideMenu();
      if (!openIconButton.classList.contains(show_class)) {
        openIconButton.classList.add(show_class);
      }
      if (closeIconButton.classList.contains(show_class)) {
        closeIconButton.classList.remove(show_class);
      }
    } else {
      this.pixSideMenuComponent.openSideMenu();
      if (openIconButton.classList.contains(show_class)) {
        openIconButton.classList.remove(show_class);
      }
      if (!closeIconButton.classList.contains(show_class)) {
        closeIconButton.classList.add(show_class);
      }
    }
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
    }, 75);
  }
}
