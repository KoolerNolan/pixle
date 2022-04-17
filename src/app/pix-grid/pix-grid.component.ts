import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {PixGridElementComponent} from '../pix-grid-element/pix-grid-element.component';
import {STYLESHEETS_PATH} from '../app.component';
import {DOCUMENT} from '@angular/common';
import {WINDOW} from '../window-injection.token';

@Component({
  selector: 'app-pix-grid',
  templateUrl: './pix-grid.component.html',
  styleUrls: [STYLESHEETS_PATH + 'pix-grid.component.min.css']
})
export class PixGridComponent implements OnInit, AfterViewInit {
  @ViewChild('grid_wrapper') private grid_wrapper!: ElementRef;
  @ViewChild('grid_inner') private grid_inner!: ElementRef;
  @ViewChildren('pixle_emoji_input') public pixle_emoji_input!: QueryList<PixGridElementComponent>;

  @Input() grid_image: number[][] = [];
  @Output() sendMatchStatus: EventEmitter<number> = new EventEmitter<number>();

  grid_image_width: number = 0;
  grid_image_height: number = 0;

  private prev_window_width: number = 0;
  private prev_window_height: number = 0;

  constructor(@Inject(DOCUMENT) private document: Document, @Inject(WINDOW) private readonly window: Window) {
  }

  ngOnInit(): void {
    if (this.grid_image.length <= 0) return;
    this.grid_image_width = this.grid_image[0].length;
    this.grid_image_height = this.grid_image.length;

    this.window.addEventListener('resize', () => {
      this.scaleDownGridElements();
    });
  }

  ngAfterViewInit() {
    this.window.setTimeout(() => {
      this.setInitialSizes();
    }, 10);
    this.setFlipStatus(false);
  }

  /**
   * Show the pixle --> swap emojis on all tiles
   *
   * OR
   *
   * Hide the pixle --> swap emojis on all tiles
   * Flip tiles over
   *
   * @param reverse
   */
  public setFlipStatus(reverse: boolean = true): void {
    let temp_pix_grid_comps: PixGridElementComponent[] = this.pixle_emoji_input.toArray();
    for (let i: number = 0; i < temp_pix_grid_comps.length; i++) {
      if (temp_pix_grid_comps[i].grid_element_type !== 0) continue;
      if (reverse) {
        temp_pix_grid_comps[i].reverseFlip();
      } else {
        temp_pix_grid_comps[i].initFlip();
      }
    }
  }

  /**
   * Used inside an EventListener attached to the window
   *
   * @private
   */
  private scaleDownGridElements(): void {
    this.setInitialSizes();
  }

  /**
   * Set the (initial) sizes of every grid participant
   *
   * @private
   */
  private setInitialSizes(): void {
    let grid_wrapper_element: HTMLElement = this.grid_wrapper.nativeElement;
    let grid_buffer_element: HTMLElement = this.grid_wrapper.nativeElement.querySelector('div.pix-grid-buffer');
    let grid_inner_element: HTMLElement = this.grid_inner.nativeElement;

    let padding_top: number = parseInt(this.window.getComputedStyle(grid_buffer_element, null).paddingTop);
    let padding_bottom: number = parseInt(this.window.getComputedStyle(grid_buffer_element, null).paddingBottom);
    let padding_offset: number = padding_top + padding_bottom;
    let real_height_of_buffer: number = grid_buffer_element.offsetHeight - padding_offset;

    let grid_inner_new_width: number = grid_buffer_element.offsetWidth;
    if (this.prev_window_height === 0 || this.prev_window_height != this.window.innerHeight) {
      // If window is getting resized on y-axis
      if (grid_buffer_element.offsetWidth < grid_wrapper_element.offsetWidth || real_height_of_buffer <= grid_inner_element.offsetHeight) {
        grid_inner_new_width = this.calculateWidthOfGridBufferElementViaWindowHeight();
      }
      this.prev_window_height = this.window.innerHeight;
    } else if (this.prev_window_width === 0 || this.prev_window_width != this.window.innerWidth) {
      // If window is getting resized on x-axis
      if ((grid_buffer_element.offsetWidth < grid_wrapper_element.offsetWidth
        || this.window.innerWidth <= grid_wrapper_element.offsetWidth) && real_height_of_buffer > grid_inner_element.offsetHeight) {
        grid_inner_new_width = this.calculateWidthOfGridBufferElementViaWindowWidth();
      }
      this.prev_window_width = this.window.innerWidth;
    }

    let padding_left: number = parseInt(this.window.getComputedStyle(grid_wrapper_element, null).paddingLeft);
    let padding_right: number = parseInt(this.window.getComputedStyle(grid_wrapper_element, null).paddingRight);

    let min: number = 135;
    let max: number = grid_wrapper_element.offsetWidth - (padding_left + padding_right);
    let clamp_grid_inner_width: number = Math.min(Math.max(grid_inner_new_width, min), max);
    grid_buffer_element.style.width = clamp_grid_inner_width + 'px';
  }

  /**
   * Calculate the grid-buffer width by looking at the window inner width
   *
   * @private
   */
  private calculateWidthOfGridBufferElementViaWindowWidth(): number {
    let grid_wrapper_element: HTMLElement = this.grid_wrapper.nativeElement;
    let padding_left: number = parseInt(this.window.getComputedStyle(grid_wrapper_element, null).paddingLeft);
    let padding_right: number = parseInt(this.window.getComputedStyle(grid_wrapper_element, null).paddingRight);
    return this.window.innerWidth - (padding_left + padding_right);
  }

  /**
   * Calculate the grid-buffer width by looking at the window inner height
   *
   * @private
   */
  private calculateWidthOfGridBufferElementViaWindowHeight(): number {
    let grid_buffer_element: HTMLElement = this.grid_wrapper.nativeElement.querySelector('div.pix-grid-buffer');
    let ui_wrapper_element: HTMLElement | null = this.document.getElementById('pix-grid-ui');
    let header_element: HTMLElement | null = this.document.body.querySelector('header.navbar');

    if ((header_element == null || undefined) || (ui_wrapper_element == null || undefined)) return grid_buffer_element.offsetWidth;

    let padding_top: number = parseInt(this.window.getComputedStyle(grid_buffer_element, null).paddingTop);
    let padding_bottom: number = parseInt(this.window.getComputedStyle(grid_buffer_element, null).paddingBottom);
    let padding_offset: number = padding_top + padding_bottom;

    let window_inner_height: number = this.window.innerHeight - header_element.offsetHeight;
    let relative_ui_wrapper_height_per: number = ui_wrapper_element.offsetHeight / window_inner_height;
    let relative_grid_wrapper_height: number = window_inner_height * (1 - relative_ui_wrapper_height_per);
    let new_grid_buffer_width: number = ((relative_grid_wrapper_height / this.grid_image_height) * this.grid_image_width) - padding_offset;

    grid_buffer_element.style.maxWidth = new_grid_buffer_width + 'px';
    return new_grid_buffer_width;
  }
}
