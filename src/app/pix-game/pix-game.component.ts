import {AfterViewInit, Component, Inject, OnInit, ViewChild} from '@angular/core';
import {Location} from '@angular/common';
import {GREENSQUARE, ORANGESQUARE, PIXLE_ICONS, REDSQUARE, YELLOWSQUARE} from '../database/emoji.database';
import {IPopUp} from '../interface/popup-message.interface';
import {PixPopupMessageComponent} from '../pix-popup-message/pix-popup-message.component';
import {Router} from '@angular/router';
import {HelperFunctionsService} from '../abstract/services/helper-functions.service';
import {IPixle} from '../interface/pixle.interface';
import {PixGridComponent} from '../pix-grid/pix-grid.component';
import {GameManager} from './game.manager';
import {STYLESHEETS_PATH} from '../app.component';
import {WINDOW} from '../window-injection.token';
import {PixGridElementComponent} from '../pix-grid-element/pix-grid-element.component';
import {PixGridUiComponent} from '../pix-grid-ui/pix-grid-ui.component';
import * as PixleList from '../database/pixle-arts.database.json';

// Popup messages
const MISSING_PIXLE_MSG: IPopUp = {
  headline: 'Missing pixle data!',
  subline: 'There was a mistake retrieving a pixle from the database.',
  message_body: 'If this issue occurs more than it should, report this bug to the team.'
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

// Timer
const UNDO_FLIP_TIME: number = 1435;

@Component({
  selector: 'app-pix-game',
  templateUrl: './pix-game.component.html',
  styleUrls: [STYLESHEETS_PATH + 'pix-game.component.min.css']
})
export class PixGameComponent implements OnInit, AfterViewInit {
  pixle_arts: IPixle[] = PixleList; // <-- pulled database
  pixle_id: number = -1;
  pixle_image: number[][] = [];
  pixle_image_width: number = 0;
  pixle_image_height: number = 0;
  pixle_emoji_list: number[] = [];
  pixle_share_result: string = '';
  validating: boolean = false;
  private current_date: Date = new Date();
  @ViewChild('match_status') private match_status_msg!: PixPopupMessageComponent;
  @ViewChild(PixGridComponent) private pixGridComponent!: PixGridComponent;
  @ViewChild(PixGridUiComponent) private pixGridUiComponent!: PixGridUiComponent;

  constructor(private router: Router, private location: Location, @Inject(WINDOW) private readonly window: Window) {
  }

  /**
   * Get the emoji by its id --> search it in the emoji collection
   * Return an array of codepoints
   *
   * @param emoji_ids
   * @return Emoji codepoints
   */
  public static getEmojisFromListById(emoji_ids: number[] = []): number[] {
    let temp_emoji_codepoints: number[] = [];
    for (let i: number = 0; i < emoji_ids.length; i++) {
      let emoji_codepoint: number = PIXLE_ICONS[emoji_ids[i]];
      temp_emoji_codepoints.push(emoji_codepoint);
    }
    return temp_emoji_codepoints;
  }

  ngOnInit(): void {
    this.searchRandomPixleArt();
  }

  ngAfterViewInit(): void {
    if (this.pixle_image.length <= 0) {
      this.sendMatchMessage(MISSING_PIXLE_MSG);
      return;
    }
    this.startGame();
  }

  /**
   * Receive reload request
   */
  public async receiveReloadRequest(): Promise<void> {
    if (this.validating) return;
    let absolute_path: string = this.location.path();
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    // Reload component --> redirect to same url but do not reuse old one
    await this.router.navigateByUrl(absolute_path, {skipLocationChange: true}).then(() => {
      this.router.navigate([absolute_path]);
      GameManager.resetGame();
    });
  }

  /**
   * Receive the current status of the ongoing match and evaluate the status number
   *
   * @param msg_object
   */
  public sendMatchMessage(msg_object: IPopUp): void {
    let popup_msg: PixPopupMessageComponent = this.match_status_msg;
    popup_msg.writeNewMessage(msg_object);
    popup_msg.addClassToHTMLElement(popup_msg.msg_container.nativeElement);
  }

  /**
   * Receive validation request from the ui
   */
  public receiveValidationRequest(): void {
    if (this.validating) return;
    this.validatePixle();
  }

  /**
   * Start the game
   * Show the pixle at the beginning for a set duration
   * Hide it, if the timer is over
   *
   * @private
   */
  private startGame(): void {
    this.window.setTimeout(() => {
      GameManager.initGame();
      this.pixGridComponent.flipWholePixle(true);
    }, UNDO_FLIP_TIME);
  }

  /**
   * Search for any pixle art from the database (get a random one)
   * Emit an event, which sends the chosen pixle object out to be received by other components
   *
   * @return Operation successful
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
    let temp_pixle_image: number[][] = [];
    for (let i: number = 0; i < pixle_art_tiles.length; i++) {
      let emojis_in_tile: number[] = PixGameComponent.getEmojisFromListById(pixle_art_tiles[i]);
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
   * @return Operation successful
   * @private
   */
  private getEmojiList(): boolean {
    if (this.pixle_image.length <= 0) return false;
    let pixle_convert: number[] = HelperFunctionsService.twoDimensionalArrayToOneDimensional(this.pixle_image);
    let temp_emoji_list: number[] = [];
    for (let i: number = 0; i < pixle_convert.length; i++) {
      for (let j: number = pixle_convert.length - 1; j > 0; j--) {
        // Make absolutely sure that both picked entries are the exact same (or not)
        if (pixle_convert[j] === pixle_convert[i]) {
          let emoji_codepoint: number = pixle_convert[i];
          // Check if there already exists this exact emoji code point in the temporary array
          if (temp_emoji_list.includes(emoji_codepoint)) break;
          temp_emoji_list.push(emoji_codepoint);
        }
      }
    }
    this.pixle_emoji_list = temp_emoji_list;
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
        if (one_pixle_tile.pixle_emoji_codepoint !== this.pixle_image[i][j]) {
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
    let pixle_details: string = 'Z' + this.pixle_id + ' / X' + this.pixle_image_width + ' / Y' + this.pixle_image_height;
    let results_info_text: string = 'Well, ... winning isn\'t everything.';
    if (GameManager.pixle_solved) {
      results_info_text = 'First try! I bet you won\'t even get one row right!';
    }
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
    this.pixle_share_result = '\n\n' + pixle_status_map + '\n' + pixle_details + '\n\n' + results_info_text;
  }

  /**
   * Generate a status map after solving a pixle or just finishing a match
   * The status map displays the lives left on each tile of a pixle
   *
   * @return Generated message
   * @private
   */
  private generatePixleStatusMap(): string[] {
    let grid_elements_array: PixGridElementComponent[] = this.pixGridComponent.pixle_emoji_input.toArray();
    let pixle_status_map: string[] = [];
    for (let i: number = 0; i < grid_elements_array.length; i++) {
      switch (grid_elements_array[i].pixle_tile_lives) {
        case 0:
          pixle_status_map.push(String.fromCodePoint(REDSQUARE));
          break;
        case 1:
          pixle_status_map.push(String.fromCodePoint(ORANGESQUARE));
          break;
        case 2:
          pixle_status_map.push(String.fromCodePoint(YELLOWSQUARE));
          break;
        case 3:
        default:
          pixle_status_map.push(String.fromCodePoint(GREENSQUARE));
          break;
      }
    }
    return pixle_status_map;
  }
}
