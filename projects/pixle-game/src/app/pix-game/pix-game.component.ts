import {AfterViewInit, Component, Inject, OnInit, ViewChild} from '@angular/core';
import {DOCUMENT, Location} from '@angular/common';
import {
  CODEPOINT_GREENSQUARE,
  CODEPOINT_ORANGESQUARE,
  CODEPOINT_REDSQUARE,
  CODEPOINT_YELLOWSQUARE,
  PIXLE_ICONS
} from '@typescript/emoji.database';
import {IPopUp} from '@interface/popup-message.interface';
import {PopupMessageComponent} from '@typescript/popup-message/popup-message.component';
import {Router} from '@angular/router';
import {HelperFunctionsService} from '@abstract/services/helper-functions.service';
import {IPixle} from '@interface/pixle.interface';
import {PixGridComponent} from '../pix-grid/pix-grid.component';
import {GameManager} from './game.manager';
import {STYLESHEETS_PATH} from '../app.component';
import {WINDOW} from '@typescript/window-injection.token';
import {PixGridElementComponent} from '../pix-grid-element/pix-grid-element.component';
import {PixGridUiComponent} from '../pix-grid-ui/pix-grid-ui.component';
import {default as PixleList} from '../database/pixle-arts.database.json';

export const SUPPORT_EMAIL: string = 'support@nani-games.net';

// Popup messages
const MISSING_PIXLE_MSG: IPopUp = {
  headline: 'Missing pixle data!',
  subline: 'There was a mistake retrieving a pixle from the database.',
  message_body: 'If this issue occurs more often than it should, report it to the team.</br>' +
    '<a class="share-via-mail" href="mailto:' + SUPPORT_EMAIL + '">' + SUPPORT_EMAIL + '</a>'
};
const SUCCESS_PIXLE_MSG: IPopUp = {
  headline: 'Congratulations!',
  subline: '',
  message_body: 'You\'ve made it, keep going!</br>Challenge your friends and family by sharing your score.'
};
const FAILED_PIXLE_MSG: IPopUp = {
  headline: 'No way!',
  subline: '',
  message_body: 'This is it... . You\'ve lost.</br>But i\'m believing in you, hang in there!'
};

// Cookie notification
const COOKIE_NOTIF_MSG: IPopUp = {
  headline: 'Cookie alert!',
  subline: '',
  message_body: 'We are required to inform you about the usage of cookies on our web application. These are required' +
    ' and used to store information about the current match and applied game settings. Closing this notification means you agree with the usage of cookies.'
};

// Timer
const UNDO_FLIP_TIME: number = 1575;

@Component({
  selector: 'app-pix-game',
  templateUrl: './pix-game.component.html',
  styleUrls: [STYLESHEETS_PATH + 'pix-game.component.min.css']
})
export class PixGameComponent implements OnInit, AfterViewInit {
  pixle_arts: IPixle[] = PixleList; // <-- pulled database
  pixle_id: number = -1;
  pixle_image: string[][] = [];
  pixle_image_width: number = 0;
  pixle_image_height: number = 0;
  pixle_emoji_list: string[] = [];
  pixle_share_result: string = '';
  validating: boolean = false;
  cookie_consent: boolean = false;
  cookie_popup_is_closed: boolean = true;
  private current_date: Date = new Date();
  private countdown_start: any;
  @ViewChild('match_status') private match_status_msg!: PopupMessageComponent;
  @ViewChild('cookie_alert') private cookie_alert!: PopupMessageComponent;
  @ViewChild(PixGridComponent) private pixGridComponent!: PixGridComponent;
  @ViewChild(PixGridUiComponent) private pixGridUiComponent!: PixGridUiComponent;

  constructor(private router: Router, private location: Location, @Inject(DOCUMENT) private document: Document, @Inject(WINDOW) private readonly window: Window) {
    HelperFunctionsService.cookie_consent.subscribe(value => {
      this.cookie_consent = value;
    });
  }

  /**
   * Get the emoji by its id --> search it in the emoji collection
   * Return an array of codepoints
   *
   * @param emoji_ids
   * @return {string[]} Array of strings --> twa emoji classes
   */
  public static getEmojisFromListById(emoji_ids: number[] = []): string[] {
    let temp_twa_emoji_classes: string[] = [];
    for (let i: number = 0; i < emoji_ids.length; i++) {
      let twa_emoji_class: string = PIXLE_ICONS[emoji_ids[i]];
      temp_twa_emoji_classes.push(twa_emoji_class);
    }
    return temp_twa_emoji_classes;
  }

  ngOnInit(): void {
    // Check if a cookie has been created to skip the cookie notification
    let cookie_consent_given: string | null = HelperFunctionsService.getRawCookie('cookie_consent');
    let cookie_consent_bool: boolean = (cookie_consent_given === null) ? false : JSON.parse(cookie_consent_given.toLowerCase());
    this.cookie_popup_is_closed = cookie_consent_bool;
    HelperFunctionsService.cookie_consent.next(cookie_consent_bool);
    // Get the stored theme data, if available, and "restore" the previous settings
    let previous_theme: string | null = HelperFunctionsService.getCookie('last_theme');
    if (previous_theme != null) {
      this.document.body.dataset['theme'] = previous_theme;
    }
    // Search for the pixle which is due today
    this.searchRandomPixleArt();

    HelperFunctionsService.addEventListenerToElement(this.window, 'load', () => {
      if (!this.cookie_consent && !this.cookie_popup_is_closed) return;
      this.initGame();
    });
  }

  ngAfterViewInit() {
    // If the consent has not been given to the usage of cookies --> show alert
    if (!this.cookie_consent && !this.cookie_popup_is_closed) {
      this.sendMatchMessage(COOKIE_NOTIF_MSG, this.cookie_alert);
      return;
    }
    if (GameManager.game_reloaded) {
      this.initGame();
    }
  }

  /**
   * Receive reload request
   */
  public async receiveReloadRequest(): Promise<void> {
    if (this.validating) return;
    let absolute_path: string = decodeURI(this.location.path());
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    // Reload component --> redirect to same url but do not reuse old one
    GameManager.game_reloaded = await this.router.navigateByUrl('/', {skipLocationChange: true}).then(() => {
      this.window.clearTimeout(this.countdown_start);
      this.router.navigated = false;
      GameManager.resetGame();
      // Reload the game component
      return this.router.navigate([absolute_path]);
    });
  }

  /**
   * Receive the emitted event which tells the game component if a popup has been closed
   *
   * @param paket
   */
  public receivePopupHasBeenClosed(paket: boolean = false): void {
    HelperFunctionsService.cookie_consent.next(paket);
    this.cookie_popup_is_closed = this.cookie_alert.popup_is_closed;
    HelperFunctionsService.createCookie('cookie_consent', String(paket));
    // Start the game
    this.initGame();
  }

  /**
   * Receive the current status of the ongoing match and evaluate the status number
   *
   * @param msg_object
   * @param popup_element
   */
  public sendMatchMessage(msg_object: IPopUp, popup_element: PopupMessageComponent = this.match_status_msg): void {
    let popup_msg: PopupMessageComponent = popup_element;
    popup_msg.writeNewMessage(msg_object);
    popup_msg.openPopup();
  }

  /**
   * Receive validation request from the ui
   */
  public receiveValidationRequest(): void {
    if (this.validating) return;
    this.validatePixle();
  }

  /**
   * Initialize the game
   *
   * @private
   */
  private initGame(): void {
    // Check if a pixle image is available
    if (this.pixle_image.length <= 0) {
      this.sendMatchMessage(MISSING_PIXLE_MSG);
      return;
    }
    this.startGame();
    GameManager.game_reloaded = false;
  }

  /**
   * Start the game
   * Show the pixle at the beginning for a set duration
   * Hide it, if the timer is over
   *
   * @private
   */
  private startGame(): void {
    this.countdown_start = setTimeout(() => {
      GameManager.initGame();
      if (HelperFunctionsService.getSessionCookie('lock_grid') === '1' && HelperFunctionsService.getSessionCookie('pixle_id') === this.pixle_id.toString()) return;
      // Undo flip --> Grid will be flipped over
      this.pixGridComponent.flipWholePixle(true);
      HelperFunctionsService.createSessionCookie('lock_grid', '1');
      HelperFunctionsService.createSessionCookie('pixle_id', this.pixle_id.toString());
    }, UNDO_FLIP_TIME);
  }

  /**
   * Search for any pixle art from the database (get a random one)
   * Emit an event, which sends the chosen pixle object out to be received by other components
   *
   * @return {boolean} Operation successful
   * @private
   */
  private searchRandomPixleArt(): boolean {
    let selected_pixle_art: IPixle | null = null;
    let current_date_formatted: string = HelperFunctionsService.formatDate(new Date(this.current_date));
    // Go through every entry and check the dates
    for (let i = 0; i < this.pixle_arts.length; i++) {
      let current_pixle: IPixle = this.pixle_arts[i];
      let current_pixle_date: string = HelperFunctionsService.formatDate(new Date(current_pixle.date));
      if (current_pixle_date === current_date_formatted) {
        selected_pixle_art = current_pixle;
        break;
      }
    }
    if (selected_pixle_art == undefined || null) return false;
    let pixle_art_tiles: number[][] = selected_pixle_art.tiles;
    // Go through the pixle image --> contains only emoji ids --> convert them to codepoints
    let temp_pixle_image: string[][] = [];
    for (let i: number = 0; i < pixle_art_tiles.length; i++) {
      let emojis_in_tile: string[] = PixGameComponent.getEmojisFromListById(pixle_art_tiles[i]);
      temp_pixle_image.push(emojis_in_tile);
    }
    this.pixle_image = temp_pixle_image;
    this.pixle_id = selected_pixle_art.id;
    // Make sure a pixle tile array was assigned
    if (this.pixle_image.length <= 0) return false;
    this.pixle_image_height = this.pixle_image.length;
    this.pixle_image_width = this.pixle_image[0].length;

    return this.getEmojiList();
  }

  /**
   * Get the list of emojis used in the pixle
   *
   * @return {boolean} Operation successful
   * @private
   */
  private getEmojiList(): boolean {
    if (this.pixle_image.length <= 0) return false;
    let pixle_convert: string[] = HelperFunctionsService.twoDimensionalArrayToOneDimensional(this.pixle_image);
    let temp_twa_emoji_classes: string[] = [];
    for (let i: number = 0; i < pixle_convert.length; i++) {
      for (let j: number = pixle_convert.length - 1; j > 0; j--) {
        // Make absolutely sure that both picked entries are the exact same (or not)
        if (pixle_convert[j] === pixle_convert[i]) {
          let twa_emoji_class: string = pixle_convert[i];
          // Check if there already exists this exact emoji code point in the temporary array
          if (temp_twa_emoji_classes.includes(twa_emoji_class)) break;
          temp_twa_emoji_classes.push(twa_emoji_class);
        }
      }
    }
    this.pixle_emoji_list = temp_twa_emoji_classes;
    return true;
  }

  /**
   * Validate the pixle
   * Easy version: go through every tile and check its validity separately
   *
   * @private
   */
  private validatePixle(): void {
    if (!GameManager.game_started || GameManager.pixle_solved || this.validating) return;
    this.pixGridComponent.checkGridRowTimers();
    this.validating = true;

    let temp_pix_grid_comps: PixGridElementComponent[] = this.pixGridComponent.pixle_emoji_input.toArray();
    let total_count: number = 0, failed_count: number = 0;
    // Check every pixle tile if its valid --> emoji at the exact same position as in the original pixle
    for (let i: number = 0; i < this.pixle_image_height; i++) {
      let solved_tiles_count: number = 0;
      for (let j: number = 0; j < this.pixle_image_width; j++) {
        let current_column: number = (this.pixle_image_width * i) + j;
        let one_pixle_tile: PixGridElementComponent = temp_pix_grid_comps[current_column];
        if (one_pixle_tile.twa_emoji_class_front_face !== this.pixle_image[i][j]) {
          one_pixle_tile.updateTileStatus(false);
          if (one_pixle_tile.pixle_tile_lives <= 0) {
            failed_count++;
          }
          continue;
        }
        one_pixle_tile.updateTileStatus(true);
        solved_tiles_count++;
      }
      total_count += solved_tiles_count;
    }
    // If any tile has reached its limits --> went out of lives --> game over
    if (failed_count > 0) {
      this.sendMatchMessage(FAILED_PIXLE_MSG);
      this.generateShareMessage();
      GameManager.resetGame();
    } else {
      // Player has won the game
      let tile_amount: number = this.pixle_image_width * this.pixle_image_height;
      if (total_count >= tile_amount) {
        GameManager.pixle_solved = true;
        GameManager.game_started = false;
        this.sendMatchMessage(SUCCESS_PIXLE_MSG);
        this.generateShareMessage();
      } else {
        // Player didn't win yet --> reset flip-state of some tiles
        this.window.setTimeout(() => {
          this.pixGridComponent.flipWholePixle(true);
          this.validating = false;
        }, UNDO_FLIP_TIME);
        return;
      }
    }
    this.pixGridUiComponent.switchUiElements();
    this.validating = false;
  }

  /**
   * Generate the share message
   *
   * @private
   */
  private generateShareMessage(): void {
    let pixle_title: string = 'Pixle';
    let pixle_details: string = this.pixle_id + '/' + this.pixle_image_width + '/' + this.pixle_image_height;
    let share_result: string[] = this.generatePixleStatusMap();
    let pixle_status_map: string = '';
    for (let i = 0; i < share_result.length; i++) {
      let one_pixle_tile: string = pixle_status_map + share_result[i];
      if ((i + 1) % this.pixle_image_width === 0) {
        pixle_status_map = one_pixle_tile + '\n';
      } else {
        pixle_status_map = one_pixle_tile;
      }
    }
    this.pixle_share_result = pixle_title + '\n\n' + pixle_status_map + '\n\n' + pixle_details;
  }

  /**
   * Generate a status map after solving a pixle or just finishing a match
   * The status map displays the lives left on each tile of a pixle
   *
   * @return {string[]} Generated message
   * @private
   */
  private generatePixleStatusMap(): string[] {
    let grid_elements_array: PixGridElementComponent[] = this.pixGridComponent.pixle_emoji_input.toArray();
    let pixle_status_map: string[] = [];
    for (let i: number = 0; i < grid_elements_array.length; i++) {
      switch (grid_elements_array[i].pixle_tile_lives) {
        case 0:
          pixle_status_map.push(String.fromCodePoint(CODEPOINT_REDSQUARE));
          break;
        case 1:
          pixle_status_map.push(String.fromCodePoint(CODEPOINT_ORANGESQUARE));
          break;
        case 2:
          pixle_status_map.push(String.fromCodePoint(CODEPOINT_YELLOWSQUARE));
          break;
        case 3:
        default:
          pixle_status_map.push(String.fromCodePoint(CODEPOINT_GREENSQUARE));
          break;
      }
    }
    return pixle_status_map;
  }
}
