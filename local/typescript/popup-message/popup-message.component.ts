import {AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild} from '@angular/core';
import {IPopUp} from '../interface/popup-message.interface';
import {AbstractHtmlElement} from '../abstract/abstract.html-element';

const DEFAULT_MSG: IPopUp = {
  headline: 'Hmm..., this isn\'t supposed to be shown already...',
  subline: '',
  message_body: 'Did you try something??'
};

@Component({
  selector: 'app-popup-message',
  templateUrl: './popup-message.component.html',
  styleUrls: ['../../stylesheets/css/popup-message.component.min.css']
})
export class PopupMessageComponent extends AbstractHtmlElement implements AfterViewInit {
  @ViewChild('msg_container') public msg_container!: ElementRef;
  @ViewChild('msg_headline') private msg_headline!: ElementRef;
  @ViewChild('msg_description') private msg_description!: ElementRef;
  @Output() sendPopupHasBeenClosed: EventEmitter<boolean> = new EventEmitter<boolean>();

  ngAfterViewInit(): void {
    // Write default message
    this.writeNewMessage(DEFAULT_MSG);
  }

  /**
   * Writes a new message on the popup panel
   *
   * @param msg_object
   */
  public writeNewMessage(msg_object: IPopUp): void {
    if (msg_object == null || undefined) return;
    this.msg_headline.nativeElement.innerHTML = msg_object.headline;
    this.msg_description.nativeElement.innerHTML = msg_object.message_body;
  }

  /**
   * Close the popup
   */
  public closePopup(): void {
    this.removeClassFromHTMLElement(this.msg_container.nativeElement);
    this.sendPopupHasBeenClosed.emit(true);
  }
}
