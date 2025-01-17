import { getShadowElement, deepQuerySelectorAll, getActiveElement, toggleAttribute } from '@tylertech/forge-core';
import { BaseAdapter, IBaseAdapter } from '../core/base/base-adapter';
import { IOption } from '../select';
import { IAutocompleteComponent } from './autocomplete';
import { AUTOCOMPLETE_CONSTANTS, IAutocompleteOptionGroup } from './autocomplete-constants';
import { TEXT_FIELD_CONSTANTS } from '../text-field';
import { IListDropdown, IListDropdownConfig, ListDropdown } from '../list-dropdown';
import { CHIP_FIELD_CONSTANTS } from '../chip-field';
import { IPopupComponent, POPUP_CONSTANTS } from '../popup';

export interface IAutocompleteAdapter extends IBaseAdapter {
  setInputElement(): HTMLInputElement;
  setInputAttribute(name: string, value: string): void;
  addInputListener(type: string, listener: (evt: Event) => void): void;
  removeInputListener(type: string, listener: (evt: Event) => void): void;
  intializeInputAccessibility(identifier: string): void;
  isWrappingChipField(): boolean;
  show(config: IListDropdownConfig, popupTarget: string): void;
  hide(listener: () => void): void;
  focus(): void;
  setOptions(options: IOption[] | IAutocompleteOptionGroup[]): void;
  appendOptions(options: IOption[] | IAutocompleteOptionGroup[]): void;
  setSelectedText(value: string): void;
  getInputValue(): string;
  selectInputValue(): void;
  setDismissListener(listener: () => void): void;
  toggleOptionMultiple(index: number, selected: boolean): void;
  isFocusWithinPopup(target: HTMLElement): boolean;
  hasFocus(): boolean;
  hasInputElement(): boolean;
  setDropdownIconListener(type: string, listener: EventListener): void;
  removeDropdownIconListener(type: string, listener: EventListener): void;
  setClearButtonListener(type: string, listener: EventListener): void;
  removeClearButtonListener(type: string, listener: EventListener): void;
  getPopupElement(): HTMLElement | null;
  propagateKey(key: string): void;
  updateActiveDescendant(id: string): void;
  getTargetElementWidth(selector: string): number;
  activateFirstOption(): void;
  activateSelectedOption(): void;
  activateOptionByIndex(value: number): void;
  setBusyVisibility(busy: boolean): void;
  getActiveOptionIndex(): number | null;
  clearActiveOption(): void;
  setSelectedOptions(options: IOption[]): void;
}

/**
 * The DOM adapter for the `<forge-autocomplete>` element.
 */
export class AutocompleteAdapter extends BaseAdapter<IAutocompleteComponent> implements IAutocompleteAdapter {
  private _inputElement: HTMLInputElement;
  private _listDropdown?: IListDropdown;
  private _targetElement?: HTMLElement;
  
  constructor(component: IAutocompleteComponent) {
    super(component);
    this.setInputElement();
  }

  public setInputElement(): HTMLInputElement {
    const inputElements = deepQuerySelectorAll(this._component, AUTOCOMPLETE_CONSTANTS.selectors.INPUT, false);
    if (inputElements.length) {
      this._inputElement = inputElements[0] as HTMLInputElement;
    }
    return this._inputElement;
  }

  public setInputAttribute(name: string, value: string): void {
    this._inputElement.setAttribute(name, value);
  }

  public addInputListener(type: string, listener: (evt: Event) => void): void {
    this._inputElement.addEventListener(type, listener);
  }

  public removeInputListener(type: string, listener: (evt: Event) => void): void {
    this._inputElement.removeEventListener(type, listener);
  }

  public intializeInputAccessibility(identifier: string): void {
    this._inputElement.setAttribute('autocomplete', 'off');
    this._inputElement.setAttribute('role', 'combobox');
    this._inputElement.setAttribute('aria-live', 'polite');
    this._inputElement.setAttribute('aria-atomic', 'true');
    this._inputElement.setAttribute('aria-haspopup', 'true');
    this._inputElement.setAttribute('aria-expanded', 'false');
    this._inputElement.setAttribute('aria-autocomplete', 'list');
  }

  public isWrappingChipField(): boolean {
    return !!this._component.querySelector(CHIP_FIELD_CONSTANTS.elementName);
  }

  public show(config: IListDropdownConfig, popupTarget: string): void {
    this._targetElement = this._getTargetElement(popupTarget);
    if (!this._targetElement) {
      return;
    }
    this._listDropdown = new ListDropdown(this._targetElement, config);
    this._listDropdown.open();
    this._inputElement.setAttribute('aria-expanded', 'true');
    this._inputElement.setAttribute('aria-controls', `list-dropdown-popup-${config.id}`);
    this._tryToggleDropdownIconRotation(true);
  }

  public hide(listener: () => void): void {
    if (!this._listDropdown) {
      return;
    }
    const { targetElement } = this._listDropdown.dropdownElement as IPopupComponent;
    targetElement.removeEventListener(POPUP_CONSTANTS.events.BLUR, listener);
    this.setBusyVisibility(false);
    this._tryToggleDropdownIconRotation(false);
    this._inputElement.removeAttribute('aria-activedescendant');
    this._inputElement.removeAttribute('aria-controls');
    this._inputElement.setAttribute('aria-expanded', 'false');
    this._listDropdown.close();
    this._listDropdown = undefined;
  }


  public setBusyVisibility(isVisible: boolean): void {
    this._listDropdown?.setBusyVisibility(isVisible);
  }

  public toggleOptionMultiple(index: number, selected: boolean): void {
    this._listDropdown?.toggleOptionMultiple(index, selected);
  }

  public setDismissListener(listener: () => void): void {
    if (!this._listDropdown || !this._listDropdown.dropdownElement) {
      return;
    }
    const dropdownElement = this._listDropdown.dropdownElement as IPopupComponent;
    if (dropdownElement.targetElement) {
      dropdownElement.targetElement.addEventListener(POPUP_CONSTANTS.events.BLUR, listener);
    }
  }

  public focus(): void {
    window.requestAnimationFrame(() => this._inputElement.focus());
  }

  public setOptions(options: IOption[] | IAutocompleteOptionGroup[]): void {
    this._listDropdown?.setOptions(options);
  }

  public appendOptions(options: IOption[] | IAutocompleteOptionGroup[]): void {
    this._listDropdown?.appendOptions(options);
  }

  public setSelectedText(value: string): void {
    this._inputElement.value = value;
  }

  public getInputValue(): string {
    return this._inputElement.value;
  }

  public selectInputValue(): void {
    window.requestAnimationFrame(() => this._inputElement.select());
  }

  public isFocusWithinPopup(target: HTMLElement): boolean {
    if (!this._listDropdown || !this._listDropdown.dropdownElement) {
      return false;
    }
    return this._listDropdown.dropdownElement.contains(target);
  }

  public hasFocus(): boolean {
    const activeElement = getActiveElement() as HTMLElement;
    return activeElement === this._inputElement || this.isFocusWithinPopup(activeElement);
  }

  public hasInputElement(): boolean {
    return !!this._inputElement;
  }

  public setDropdownIconListener(type: string, listener: EventListener): void {
    window.requestAnimationFrame(() => {
      const dropdownIcon = this._component.querySelector(AUTOCOMPLETE_CONSTANTS.selectors.DROPDOWN_ICON);
      if (dropdownIcon) {
        dropdownIcon.addEventListener(type, listener);
      }
    });
  }

  public removeDropdownIconListener(type: string, listener: EventListener): void {
    const dropdownIcon = this._component.querySelector(AUTOCOMPLETE_CONSTANTS.selectors.DROPDOWN_ICON);
    if (dropdownIcon) {
      dropdownIcon.removeEventListener(type, listener);
    }
  }

  public setClearButtonListener(type: string, listener: EventListener): void {
    window.requestAnimationFrame(() => {
      const clearButton = this._component.querySelector(AUTOCOMPLETE_CONSTANTS.selectors.CLEAR_BUTTON);
      if (clearButton) {
        clearButton.addEventListener(type, listener);
      }
    });
  }

  public removeClearButtonListener(type: string, listener: EventListener): void {
    const clearButton = this._component.querySelector(AUTOCOMPLETE_CONSTANTS.selectors.CLEAR_BUTTON);
    if (clearButton) {
      clearButton.removeEventListener(type, listener);
    }
  }

  public propagateKey(key: string): void {
    this._listDropdown?.handleKey(key);
  }

  public updateActiveDescendant(id: string): void {
    if (!this._targetElement) {
      return;
    }
    toggleAttribute(this._inputElement, !!id, 'aria-activedescendant', id);
  }

  public getTargetElementWidth(selector: string): number {
    if (!this._targetElement) {
      this._targetElement = this._getTargetElement(selector);
    }
    return this._targetElement.getBoundingClientRect().width;
  }

  public getPopupElement(): HTMLElement | null {
    return this._listDropdown?.dropdownElement ?? null;
  }

  public activateFirstOption(): void {
    this._listDropdown?.activateFirstOption();
  }

  public activateSelectedOption(): void {
    this._listDropdown?.activateSelectedOption();
  }

  public activateOptionByIndex(value: number): void {
    this._listDropdown?.activateOption(value);
  }

  public getActiveOptionIndex(): number | null {
    return this._listDropdown?.getActiveOptionIndex() ?? null;
  }

  public clearActiveOption(): void {
    this._listDropdown?.clearActiveOption();
  }

  public setSelectedOptions(options: IOption[]): void {
    if (this._listDropdown) {
      const values = options.map(o => o.value);
      this._listDropdown.setSelectedValues(values);
    }
  }

  private _getTargetElement(selector?: string): HTMLElement {
    return selector ? this._component.querySelector(selector) || this._getDefaultTargetElement() : this._getDefaultTargetElement();
  }

  private _getDefaultTargetElement(): HTMLElement {
    // This component is often used with the text-field, if so, let's target our popup around one if its internal elements for proper alignnment
    const textField = this._component.querySelector('forge-text-field');
    if (textField && textField.shadowRoot) {
      const textFieldRoot = getShadowElement(textField, TEXT_FIELD_CONSTANTS.selectors.ROOT) as HTMLElement;
      if (textFieldRoot) {
        return textFieldRoot;
      }
    }

    // This component is often used with the chip-field, if so, let's target our popup around one if its internal elements for proper alignnment
    const chipField = this._component.querySelector('forge-chip-field');
    if (chipField && chipField.shadowRoot) {
      const chipFieldRoot = getShadowElement(chipField, CHIP_FIELD_CONSTANTS.selectors.ROOT) as HTMLElement;
      if (chipFieldRoot) {
        return chipFieldRoot;
      }
    }

    return this._component.querySelector('input') || this._component;
  }

  private _tryToggleDropdownIconRotation(state: boolean): void {
    const dropdownIcon = this._component.querySelector(AUTOCOMPLETE_CONSTANTS.selectors.DROPDOWN_ICON) as HTMLElement;
    if (dropdownIcon) {
      toggleAttribute(dropdownIcon, state, AUTOCOMPLETE_CONSTANTS.attributes.DROPDOWN_ICON_OPEN);
    }
  }
}
