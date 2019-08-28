/**
 * @fileoverview entity object is class for entry object canvas view.
 */

'use strict';

import { GEHelper } from '../graphicEngine/GEHelper';
import { GEDragHelper } from '../graphicEngine/GEDragHelper';

/**
 * doxdox 'src/class/entity.js' --layout markdown --output documentation/src/class/entity.md
 *
 * ```javascript
 * this = {
 *     parent
 *     type
 *     flip
 *     collision
 *     id
 *     removed
 *     stamps
 *     shapes
 *     _rndPosX
 *     _rndPosY
 *     voice
 *     type
 *     object
 *     _scaleAdaptor
 *     textObject
 *     bgObject
 *     fontType
 *     fontSize
 *     fontBold
 *     fontItalic
 *     underLine
 *     strike
 *     cursor
 *     entity
 *     bgColor
 *     ...
 * }
 *
 *effect ={
 *     blur,
 *     hue,
 *     hsv,
 *     brightness,
 *     contrast,
 *     saturation,
 *     alpha,
 *}
 *
 * ```
 *
 * Construct entity class
 * @param {!Entry.EntryObject} object
 * @constructor
 */
Entry.EntityObject = class EntityObject {
    constructor(object) {
        /** @type {!string} */
        this.parent = object;
        this.type = object.objectType;
        /** @type {Array<xmlScript>} */
        this.flip = false;
        this.collision = Entry.Utils.COLLISION.NONE;
        this.id = Entry.generateHash();
        this.removed = false;
        this.stamps = [];
        this.shapes = [];
        this._rndPosX = 0;
        this._rndPosY = 0;
        this.voice = { speed: 0, pitch: 0, speaker: 'kyuri', volume: 1 };

        if (this.type === 'sprite') {
            this._rndPosX = GEHelper.rndPosition();
            this._rndPosY = GEHelper.rndPosition();
            this.object = GEHelper.newEmptySprite();
            this.object.pixelPerfect = true;
            this._scaleAdaptor = GEHelper.newAScaleAdaptor(this.object);
            this.setInitialEffectValue();
        } else if (this.type === 'textBox') {
            this.object = GEHelper.newContainer();
            this._scaleAdaptor = GEHelper.newAScaleAdaptor(this.object);
            this.textObject = GEHelper.textHelper.newText(
                '',
                '20px Nanum Gothic',
                '',
                'middle',
                'center'
            );

            /*
             bgObject 가 transparent 인 경우에도 textObject 가 hit 처리되어서
             container on event 가 동작해버리는 이슈가 있었음. (issues/10463)
             textObject 를 정확히 그려진 부분만 interactive 하도록 플래그 수정
             */
            this.textObject.pixelPerfect = true;

            if (GEHelper.isWebGL) {
                this.textObject.anchor.set(0.5, 0.5);
            }
            this.bgObject = GEHelper.newGraphic();
            this.bgObject.graphics.beginFill('#ffffff').drawRect(0, 0, 100, 100);
            this.object.addChild(this.bgObject);
            this.object.addChild(this.textObject);

            this.fontType = 'Nanum Gothic';
            this.fontSize = 20;
            this.fontBold = false;
            this.fontItalic = false;
            this.underLine = false;
            this.strike = false;
        }

        this.object.entity = this;
        this.object.cursor = 'pointer';
        this.object.mouseEnabled = true;
        GEDragHelper.handleDrag(this.object);

        this.object.on(GEDragHelper.types.DOWN, function({ stageX, stageY }) {
            const id = this.entity.parent.id;
            Entry.dispatchEvent('entityClick', this.entity);
            Entry.stage.isObjectClick = true;

            if (Entry.type !== 'minimize' && Entry.stage.isEntitySelectable()) {
                this.offset = {
                    x: -this.parent.x + this.entity.getX() - (stageX * 0.75 - 240),
                    y: -this.parent.y - this.entity.getY() - (stageY * 0.75 - 135),
                };
                this.cursor = 'move';
                this.entity.initCommand();
                Entry.container.selectObject(id);
            }
        });

        this.object.on(GEDragHelper.types.UP, function() {
            Entry.dispatchEvent('entityClickCanceled', this.entity);
            this.cursor = 'pointer';
            this.entity.checkCommand();
        });

        if (Entry.type !== 'minimize') {
            this.object.on(GEDragHelper.types.MOVE, function({ stageX, stageY }) {
                if (Entry.stage.isEntitySelectable()) {
                    const entity = this.entity;
                    if (entity.parent.getLock()) {
                        return;
                    }

                    if (this.offset) {
                        entity.setX(stageX * 0.75 - 240 + this.offset.x);
                        entity.setY(-(stageY * 0.75 - 135) - this.offset.y);
                    }
                    Entry.stage.updateObject();
                }
            });
        }
    }

    /**
     * 현재 엔티티 모델에 이미지등의 데이터를 주입<br/>
     * Original: Construct entity class
     * @param {?picture.model} pictureModel
     * @param {?entity.model} entityModel
     * @constructor
     */
    injectModel(pictureModel, entityModel) {
        const type = this.type;
        if (type === 'sprite') {
            this.setImage(pictureModel);
        } else if (type === 'textBox') {
            const parent = this.parent;
            entityModel.text = entityModel.text || parent.text || parent.name;
            this.setFont(entityModel.font);
            this.setBGColour(entityModel.bgColor);
            this.setColour(entityModel.colour);
            this.setUnderLine(entityModel.underLine);
            this.setStrike(entityModel.strike);
            this.setText(entityModel.text);
        }

        //entity
        if (entityModel) {
            this.syncModel_(entityModel);
        }
    }

    /**
     * 현재 엔티티를 현재 파라미터로 들어온 엔티티애 동기화 시킴<br/>
     * Original: sync this model with parameter
     * @param {!entity.model} entityModel
     * @private
     */
    syncModel_({
        x,
        y,
        regX,
        regY,
        scaleX,
        scaleY,
        rotation,
        direction,
        lineBreak,
        width,
        height,
        text,
        textAlign,
        fontSize,
        visible,
    }) {
        this.setX(x);
        this.setY(y);
        this.setRegX(regX);
        this.setRegY(regY);
        this.setScaleX(scaleX);
        this.setScaleY(scaleY);
        this.setRotation(rotation);
        this.setDirection(direction, true);
        this.setLineBreak(lineBreak);
        this.setWidth(width);
        this.setHeight(height);
        this.setText(text);
        this.setTextAlign(textAlign);
        this.setFontSize(fontSize || this.getFontSize());
        this.setVisible(visible);
    }
    /**
     * 커맨드 시작
     */
    initCommand() {
        if (!Entry.engine.isState('stop')) {
            return;
        }

        this._entityModelBefore = this.toJSON();
    }
    /**
     * 현재 커맨드 확인
     */
    checkCommand() {
        if (!Entry.engine.isState('stop')) {
            return;
        }

        const oldModel = this._entityModelBefore;
        delete this._entityModelBefore;
        const json = this.toJSON();

        if (_.isEqual(json, oldModel)) {
            return;
        }

        Entry.do('entitySetModel', this.parent.id, json, oldModel);
    }

    /**
     * 업데이트 정보 저장을 통한 되돌리기 다시하기를 할수 있게 해줌 for redo and undo
     * @param {!entity.model} entityModel
     * @return {Entry.State} capture current state
     */
    setModel(entityModel) {
        this.syncModel_(entityModel);
        Entry.dispatchEvent('updateObject');
        Entry.stage.updateObject();
    }

    /**
     * X coordinate setter
     * @param {number} x
     */
    setX(x) {
        if (typeof x !== 'number') {
            return;
        }

        /** @type {number} */
        this.x = x;
        this.object.x = this.x + this._rndPosX;
        !this.isClone && this.parent.updateCoordinateView();
        this.updateDialog();
        Entry.requestUpdate = true;
    }

    /**
     * X coordinate getter
     * @return {number}
     */
    getX(toFixedValue) {
        if (toFixedValue) {
            return Entry.Utils.toFixed(this.x, toFixedValue);
        } else {
            return this.x;
        }
    }

    /**
     * Y coordinate setter
     * @param {number} y
     */
    setY(y) {
        if (typeof y !== 'number') {
            return;
        }

        /** @type {number} */
        this.y = y;
        this.object.y = -this.y + this._rndPosY;
        !this.isClone && this.parent.updateCoordinateView();
        this.updateDialog();
        Entry.requestUpdate = true;
    }

    /**
     * Y coordinate getter
     * @return {number}
     */
    getY(toFixedValue) {
        if (toFixedValue) {
            return Entry.Utils.toFixed(this.y, toFixedValue);
        } else {
            return this.y;
        }
    }

    /**
     * direction getter
     * @return {number}
     */
    getDirection(toFixedValue) {
        if (toFixedValue) {
            return Entry.Utils.toFixed(this.direction, toFixedValue);
        } else {
            return this.direction;
        }
    }

    /**
     * direction setter
     * @param {number} direction
     * @param {boolean} flippable
     */
    setDirection(direction = 0, flippable) {
        direction = direction % 360;
        const parent = this.parent;

        if (parent.getRotateMethod() === 'vertical' && !flippable) {
            const previousIsRight = this.direction >= 0 && this.direction < 180;
            const afterIsRight = direction >= 0 && direction < 180;
            if (previousIsRight != afterIsRight) {
                this.setScaleX(-this.getScaleX());
                Entry.stage.updateObject();
                this.flip = !this.flip;
            }
        }
        /** @type {number} */
        this.direction = direction.mod(360);
        this.object.direction = this.direction * GEHelper.rotateWrite;
        !this.isClone && parent.updateRotationView();
        Entry.dispatchEvent('updateObject');
        Entry.requestUpdate = true;
    }

    /**
     * rotation setter
     * @param {number} rotation
     * */
    setRotation(rotation) {
        /** @type {number} */
        if (this.parent.getRotateMethod() !== 'free') {
            rotation = 0;
        }

        this.rotation = rotation.mod(360);
        this.object.rotation = this.rotation * GEHelper.rotateWrite;
        this.updateDialog();
        !this.isClone && this.parent.updateRotationView();
        Entry.dispatchEvent('updateObject');
        Entry.requestUpdate = true;
    }

    /**
     * rotation getter
     * @return {number}
     */
    getRotation(toFixedValue) {
        if (toFixedValue) {
            return Entry.Utils.toFixed(this.rotation, toFixedValue);
        } else {
            return this.rotation;
        }
    }

    /**
     * regX coordinate setter
     * @param {number} regX
     */
    setRegX(regX) {
        if (this.type === 'textBox') {
            regX = 0;
        }
        /** @type {number} */
        this.regX = regX;
        if (GEHelper.isWebGL) {
            this._scaleAdaptor.pivot.setX(regX);
        } else {
            this.object.regX = this.regX;
        }
        Entry.requestUpdate = true;
    }

    /**
     * regX coordinate getter
     * @return {number}
     */
    getRegX() {
        return this.regX;
    }

    /**
     * regY coordinate setter
     * @param {number} regY
     */
    setRegY(regY) {
        if (this.type === 'textBox') {
            regY = 0;
        }
        /** @type {number} */
        this.regY = regY;
        if (GEHelper.isWebGL) {
            this._scaleAdaptor.pivot.setY(regY);
        } else {
            this.object.regY = this.regY;
        }
        Entry.requestUpdate = true;
    }

    /**
     * regY coordinate getter
     * @return {number}
     */
    getRegY() {
        return this.regY;
    }

    /**
     * scaleX coordinate setter
     * @param {number} scaleX
     */
    setScaleX(scaleX) {
        /** @type {number} */
        this.scaleX = scaleX;
        if (GEHelper.isWebGL) {
            this._scaleAdaptor.scale.setX(scaleX);
            if (this.textObject) {
                this.textObject.setFontScaleX(scaleX);
            }
        } else {
            this.object.scaleX = this.scaleX;
        }
        this.parent.updateCoordinateView();
        this.updateDialog();
        Entry.requestUpdate = true;
    }

    /**
     * scaleX coordinate getter
     * @return {number}
     */
    getScaleX() {
        return this.scaleX;
    }

    /**
     * scaleY coordinate setter
     * @param {number} scaleY
     */
    setScaleY(scaleY) {
        /** @type {number} */
        this.scaleY = scaleY;
        if (GEHelper.isWebGL) {
            this._scaleAdaptor.scale.setY(scaleY);
            if (this.textObject) {
                this.textObject.setFontScaleY(scaleY);
            }
        } else {
            this.object.scaleY = this.scaleY;
        }
        this.parent.updateCoordinateView();
        this.updateDialog();
        Entry.requestUpdate = true;
    }

    /**
     * scaleY coordinate getter
     * @return {number}
     */
    getScaleY() {
        return this.scaleY;
    }

    /**
     * object size setter
     * @param {number} size
     */
    setSize(size) {
        const scale = Math.max(1, size) / this.getSize();
        this.setScaleX(this.getScaleX() * scale);
        this.setScaleY(this.getScaleY() * scale);
        !this.isClone && this.parent.updateCoordinateView();
        Entry.requestUpdate = true;
    }

    /**
     * get object size
     * @return {number}
     */
    getSize(toFixedValue) {
        const value =
            (this.getWidth() * Math.abs(this.getScaleX()) +
                this.getHeight() * Math.abs(this.getScaleY())) /
            2;
        if (toFixedValue) {
            return Entry.Utils.toFixed(value, toFixedValue);
        }
        return value;
    }

    /**
     * width coordinate setter
     * @param {number} width
     */
    setWidth(width) {
        /** @type {number} */
        this.width = width;
        //todo [박봉배] object.width -> object.$width 로 변경
        this.object.$width = this.width;
        if (this.textObject && this.getLineBreak()) {
            if (GEHelper.isWebGL) {
                this.textObject.style.wordWrapWidth = this.width;
            } else {
                this.textObject.lineWidth = this.width;
            }
        }
        this.updateDialog();
        this.updateBG();
        Entry.requestUpdate = true;
    }

    /**
     * width coordinate getter
     * @return {number}
     */
    getWidth() {
        return this.width;
    }

    /**
     * height coordinate setter
     * @param {number} height
     */
    setHeight(height) {
        /** @type {number} */
        //todo [박봉배] object.height -> object.$height 로 변경
        this.height = height;
        if (this.textObject) {
            this.object.$height = this.height;
            this.alignTextBox();
        }
        this.updateDialog();
        this.updateBG();
        Entry.requestUpdate = true;
    }

    /**
     * height coordinate getter
     * @return {number}
     */
    getHeight() {
        return this.height;
    }

    /**
     * colour setter
     * @param {?string} colour
     */
    setColour(colour = '#000000') {
        /** @type {string} */
        this.colour = colour;
        if (this.textObject) {
            GEHelper.textHelper.setColor(this.textObject, this.colour);
        }
        Entry.requestUpdate = true;
    }

    /**
     * colour getter
     * @return {colour}
     */
    getColour() {
        return this.colour;
    }

    /**
     * BG colour setter, for textBox object
     * @param {?string} colour
     */
    setBGColour(colour = 'transparent') {
        /** @type {string} */
        this.bgColor = colour;
        this.updateBG();
        //this.object.color = this.colour;
        Entry.requestUpdate = true;
    }

    /**
     * BG colour getter, for textBox object
     * @return {colour}
     */
    getBGColour() {
        return this.bgColor;
    }
    /**
     * underline setter, for textBox object
     * @param {boolean} underLine
     */
    setUnderLine(underLine = false) {
        this.underLine = underLine;
        if (GEHelper.isWebGL) {
            this.textObject.style.underLine = underLine;
        } else {
            this.textObject.underLine = underLine;
        }
        Entry.requestUpdate = true;
    }
    /**
     * underline getter, for textBox object
     * @return {boolean}
     */
    getUnderLine() {
        return this.underLine;
    }
    /**
     * strike setter, for textBox object
     * @param {boolean} strike
     */
    setStrike(strike = false) {
        this.strike = strike;
        if (GEHelper.isWebGL) {
            this.textObject.style.cancelLine = strike;
        } else {
            this.textObject.strike = strike;
        }
        Entry.requestUpdate = true;
    }
    /**
     * strike getter, for textBox object
     * @return {boolean}
     */
    getStrike() {
        return this.strike;
    }

    /**
     * font getter
     * @return {Array<Fonts>}
     */
    getFont() {
        const fontArray = [];
        if (this.fontBold) {
            fontArray.push('bold');
        }
        if (this.fontItalic) {
            fontArray.push('italic');
        }
        fontArray.push(`${this.getFontSize()}px`);
        fontArray.push(this.fontType);
        return fontArray.join(' ');
    }

    /**
     * font setter, for textBox object
     * @param {Array<Fonts>} strike
     */
    setFont(font = '20px Nanum Gothic') {
        if (this.parent.objectType !== 'textBox') {
            return;
        }
        if (this.textObject.font === font) {
            return;
        }

        const fontArray = font.split(' ');
        let i = 0;

        if ((i = fontArray.indexOf('bold') > -1)) {
            fontArray.splice(i - 1, 1);
            this.setFontBold(true);
        }
        if ((i = fontArray.indexOf('italic') > -1)) {
            fontArray.splice(i - 1, 1);
            this.setFontItalic(true);
        }
        this.setFontSize(parseInt(fontArray.shift()));
        this.setFontType(fontArray.join(' '));

        this._syncFontStyle();
        Entry.stage.update();
        this.setWidth(this.textObject.getMeasuredWidth());
        this.updateBG();
        Entry.stage.updateObject();
    }
    /**
     * line height setter, according to other attributes
     */
    setLineHeight() {
        let lineHeight;
        switch (this.getFontType()) {
            case 'Nanum Gothic Coding': {
                lineHeight = this.fontSize;
                break;
            }
            default: {
                lineHeight = 0;
                break;
            }
        }
        if (GEHelper.isWebGL) {
            this.textObject.style.lineHeight = lineHeight;
        } else {
            this.textObject.lineHeight = lineHeight;
        }
    }
    /**
     * Synchronize fonts in all text objects
     */
    syncFont() {
        const textObject = this.textObject;
        this._syncFontStyle();
        this.setLineHeight();
        Entry.stage.update();
        if (this.getLineBreak()) {
            if (this.fontType === 'Nanum Gothic Coding') {
                textObject.y = textObject.getMeasuredLineHeight() / 2 - this.getHeight() / 2 + 10;
            }
        } else {
            this.setWidth(textObject.getMeasuredWidth());
            this.setHeight(textObject.getMeasuredHeight());
        }
        Entry.stage.updateObject();
        Entry.requestUpdate = true;
    }

    /**
     * font type getter
     * @return {Font.type}
     */
    getFontType() {
        return this.fontType;
    }

    /**
     * font type setter
     * @param {?String.FontType} fontType
     */
    setFontType(fontType = 'Nanum Gothic') {
        if (this.parent.objectType !== 'textBox') {
            return;
        }
        this.fontType = fontType;
        this.syncFont();
    }

    /**
     * font size getter
     * @return {font.size}
     */
    getFontSize() {
        return this.fontSize;
    }

    /**
     * font size setter
     */
    setFontSize(fontSize = 20) {
        if (this.parent.objectType !== 'textBox') {
            return;
        }
        if (this.fontSize === fontSize) {
            return;
        }
        this.fontSize = fontSize;
        this.syncFont();
        this.alignTextBox();
    }

    /**
     * set font bold state
     */
    setFontBold(isFontBold) {
        this.fontBold = isFontBold;
        Entry.requestUpdate = true;
    }

    /**
     * toggle bold on,off and return current
     * @return {Boolean}
     */
    toggleFontBold() {
        this.fontBold = !this.fontBold;
        this.syncFont();
        return this.fontBold;
    }

    /**
     * set font italic state
     */
    setFontItalic(isFontItalic) {
        this.fontItalic = isFontItalic;
        Entry.requestUpdate = true;
    }

    /**
     * toggle italic on,off and return current
     */
    toggleFontItalic() {
        this.fontItalic = !this.fontItalic;
        this.syncFont();
        return this.fontItalic;
    }
    /**
     * getFontName
     * @return {Array<font.name>}
     */
    getFontName() {
        if (this.type !== 'textBox') {
            return;
        }
        const font = this.textObject.font;
        if (!font) {
            return '';
        }

        return font
            .split(' ')
            .filter((font) => !/^(bold|italic)$/.test(font) && !~font.indexOf('px'))
            .join(' ')
            .trim();
    }

    /**
     * text setter
     * @param {string} text
     */
    setText(text = '') {
        if (this.parent.objectType !== 'textBox') {
            return;
        }
        /** @type {string} */
        this.text = text;
        this.textObject.text = this.text;
        if (!this.lineBreak) {
            this.setWidth(this.textObject.getMeasuredWidth());
            this.parent.updateCoordinateView();
        }
        this.updateBG();
        Entry.stage.updateObject();
    }

    /**
     * text getter
     * @return {string}
     */
    getText() {
        return this.text;
    }

    /**
     * textAlign setter
     * @param {number} textAlign
     */
    setTextAlign(textAlign = Entry.TEXT_ALIGN_CENTER) {
        if (this.parent.objectType !== 'textBox') {
            return;
        }
        this.textAlign = textAlign;

        const textObj = this.textObject;
        const alignValue = Entry.TEXT_ALIGNS[textAlign];
        if (GEHelper.isWebGL) {
            const anchorX = [0.5, 0, 1];
            textObj.anchor.x = anchorX[textAlign];
            textObj.style.align = alignValue;
        } else {
            textObj.textAlign = alignValue;
        }

        this.alignTextBox();
        this.updateBG();
        Entry.stage.updateObject();
        /*
        this.setWidth(this.textObject.getMeasuredWidth());
        this.updateBG();
        */
    }

    /**
     * textAlign getter
     * @return {number}
     */
    getTextAlign() {
        return this.textAlign;
    }

    /**
     * lineBreak setter
     * @param {boolean} lineBreak
     */
    setLineBreak(lineBreak = false) {
        if (this.parent.objectType !== 'textBox') {
            return;
        }
        const isWebGL = GEHelper.isWebGL;
        const previousState = this.lineBreak;
        this.lineBreak = lineBreak;

        if (previousState && !this.lineBreak) {
            if (isWebGL) {
                this.textObject.style.wordWrap = false;
            } else {
                this.textObject.lineWidth = null;
            }
            this.setHeight(this.textObject.getMeasuredLineHeight());
            this.setText(this.getText().replace(/\n/g, ''));
            if (isWebGL) {
                this.textObject.anchor.y = 0.5;
            }
        } else if (this.lineBreak) {
            if (previousState === false) {
                this.setFontSize(this.getFontSize() * this.getScaleX());
                this.setHeight(this.textObject.getMeasuredLineHeight() * 3);
                this.setWidth(this.getWidth() * this.getScaleX());
                this.setScaleX(1);
                this.setScaleY(1);
            }
            if (isWebGL) {
                this.textObject.anchor.y = 0;
                this.textObject.style.wordWrap = true;
                this.textObject.style.breakWords = true;
                this.textObject.style.wordWrapWidth = Math.ceil(this.getWidth());
            } else {
                this.textObject.lineWidth = Math.ceil(this.getWidth());
            }
            this.alignTextBox();
            if (this.fontType === 'Nanum Gothic Coding') {
                const textObjectHeight = this.textObject.getMeasuredLineHeight();
                this.textObject.y = textObjectHeight / 2 - this.getHeight() / 2 + 10;
            }
        }

        Entry.stage.updateObject();
    }

    /**
     * lineBreak getter
     * @return {number}
     */
    getLineBreak() {
        return this.lineBreak;
    }

    /**
     * visible setter
     * @param {boolean} visible
     */
    setVisible(visible = true) {
        /** @type {string} */
        this.visible = visible;
        this.object.visible = this.visible;
        if (this.dialog) {
            this.syncDialogVisible();
        }
        Entry.requestUpdate = true;
        return this.visible;
    }

    /**
     * visible getter
     * @return {boolean}
     */
    getVisible() {
        return this.visible;
    }

    /**
     * Change picture
     * @param {?picture.model} pictureModel
     */
    setImage(pictureModel) {
        const that = this;
        delete pictureModel._id;

        Entry.assert(this.type === 'sprite', 'Set image is only for sprite object');
        if (!pictureModel.id) {
            pictureModel.id = Entry.generateHash();
        }

        this.picture = pictureModel;
        const dimension = this.picture.dimension;
        const entityWidth = this.getWidth();
        const entityHeight = this.getHeight();

        const absoluteRegX = this.getRegX() - entityWidth / 2;
        const absoluteRegY = this.getRegY() - entityHeight / 2;
        this.setWidth(dimension.width);
        this.setHeight(dimension.height);
        if (!dimension.scaleX) {
            dimension.scaleX = this.getScaleX();
            dimension.scaleY = this.getScaleY();
        }

        this.setScaleX(this.scaleX);
        this.setScaleY(this.scaleY);
        this.setRegX(this.width / 2 + absoluteRegX);
        this.setRegY(this.height / 2 + absoluteRegY);

        /**
         * //이 코드는 createjs 일때만 호출 됨.
         * @param {AtlasImageLoadingInfo} info
         */
        const onImageLoad = GEHelper.isWebGL
            ? null
            : (info) => {
                  if (this.removed) {
                      return;
                  }
                  if (info.source() !== this.object.image) {
                      return;
                  }
                  const hasFilter = !_.isEmpty(that.object.filters);
                  GEHelper.colorFilter.setCache(this, hasFilter);
                  Entry.requestUpdate = true;
              };

        GEHelper.resManager.reqResource(
            this.object,
            this.parent.scene.id,
            pictureModel,
            onImageLoad
        );
        if (GEHelper.isWebGL) {
            this._scaleAdaptor.updateScaleFactor();
            this.object.refreshFilter();
        }

        Entry.dispatchEvent('updateObject');
    }

    /**
     * Apply easel filter(effect) with selection of forced apply
     * @param {boolean} isForce
     * @param {Entity.effect} forceEffects
     */
    applyFilter(isForce, forceEffects) {
        const effects = this.effect;
        const object = this.object;

        let diffEffects = isEqualEffects(effects, this.getInitialEffectValue());
        if (!isForce && diffEffects.length === 0) {
            return;
        }

        if (Array.isArray(forceEffects)) {
            diffEffects = diffEffects.concat(forceEffects);
        }

        (function(e, obj) {
            const f = [];
            const adjust = Entry.adjustValueWithMaxMin;

            if (~diffEffects.indexOf('brightness')) {
                const brightness = adjust(e.brightness, -100, 100);
                f.push(GEHelper.colorFilter.brightness(brightness));
            }

            if (~diffEffects.indexOf('hue')) {
                f.push(GEHelper.colorFilter.hue(e.hue.mod(360)));
            }

            if (~diffEffects.indexOf('hsv')) {
                /* eslint-disable */
                let matrixValue = [
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                ];
                /* eslint-enable */

                const degrees = e.hsv * 3.6;
                const r = (degrees * 3 * Math.PI) / 180;
                const cosVal = Math.cos(r);
                const sinVal = Math.sin(r);

                let v = Math.abs(e.hsv / 100);
                if (v > 1) {
                    v = v - Math.floor(v);
                }

                if (v > 0 && v <= 0.33) {
                    /* eslint-disable */
                    matrixValue = [
                        1,
                        0,
                        0,
                        0,
                        0,
                        0,
                        cosVal,
                        sinVal,
                        0,
                        0,
                        0,
                        -1 * sinVal,
                        cosVal,
                        0,
                        0,
                        0,
                        0,
                        0,
                        1,
                        0,
                        0,
                        0,
                        0,
                        0,
                        1,
                    ];
                } else if (v <= 0.66) {
                    matrixValue = [
                        cosVal,
                        0,
                        sinVal,
                        0,
                        0,
                        1,
                        0,
                        0,
                        0,
                        0,
                        sinVal,
                        0,
                        cosVal,
                        0,
                        0,
                        0,
                        0,
                        0,
                        1,
                        0,
                        0,
                        0,
                        0,
                        0,
                        1,
                    ];
                } else if (v <= 0.99) {
                    matrixValue = [
                        cosVal,
                        sinVal,
                        0,
                        0,
                        0,
                        -1 * sinVal,
                        cosVal,
                        0,
                        0,
                        0,
                        0,
                        0,
                        1,
                        0,
                        0,
                        0,
                        0,
                        0,
                        1,
                        0,
                        0,
                        0,
                        0,
                        0,
                        1,
                    ];
                }
                /* eslint-enable */

                const colorFilter = GEHelper.colorFilter.newColorMatrixFilter(matrixValue);
                f.push(colorFilter);
            }

            if (~diffEffects.indexOf('alpha')) {
                e.alpha = adjust(e.alpha, 0, 1);
                obj.alpha = e.alpha;
            }
            if (GEHelper.isWebGL) {
                obj.setFilterAndCache(f);
            } else {
                obj.filters = f;
            }
        })(effects, object);

        this.cache();

        function isEqualEffects(effectsA, effectsB) {
            const diffEffects = [];
            for (const key in effectsA) {
                if (effectsA[key] !== effectsB[key]) {
                    diffEffects.push(key);
                }
            }
            return diffEffects;
        }
    }

    /**
     * Remove all filter
     */
    resetFilter() {
        if (this.parent.objectType !== 'sprite') {
            return;
        }

        const object = this.object;
        if (GEHelper.isWebGL) {
            object.setFilterAndCache(null);
        } else {
            object.filters = [];
        }
        this.setInitialEffectValue();
        object.alpha = this.effect.alpha;
        GEHelper.colorFilter.setCache(this, false);
    }

    /**
     * update dialog position if exist
     */
    updateDialog() {
        if (this.dialog) {
            this.dialog.update();
        }
        Entry.requestUpdate = true;
    }

    /**
     * save current state data to 'snapshot_'
     */
    takeSnapshot() {
        this.snapshot_ = this.toJSON();
        this.collision = Entry.Utils.COLLISION.NONE;
    }

    /**
     * load snapshot to current entity
     */
    loadSnapshot() {
        if (this.snapshot_) {
            this.syncModel_(this.snapshot_);
        }
        if (this.parent.objectType === 'sprite') {
            this.setImage(this.parent.getPicture());
        }

        Entry.requestUpdate = true;
    }

    /**
     * Remove itself when this is clone
     */
    removeClone(isLast) {
        if (!this.isClone) {
            return;
        }

        const clonedEntities = this.parent.clonedEntities;

        if (isLast !== true) {
            const index = clonedEntities.indexOf(this);
            if (index > -1) {
                clonedEntities.splice(index, 1);
            }
        } else {
            clonedEntities.pop();
        }

        _.result(this, 'clearExecutor');
        this.destroy(true);
    }
    /**
     * Remove All Executors on this entity
     */
    clearExecutor() {
        this.parent.script.clearExecutorsByEntity(this);
    }

    /**
     * convert this entity's data to JSON.
     * @return {JSON}
     */
    toJSON() {
        const _cut = Entry.cutDecimal;

        const json = {};
        json.x = _cut(this.getX());
        json.y = _cut(this.getY());
        json.regX = _cut(this.getRegX());
        json.regY = _cut(this.getRegY());
        json.scaleX = this.getScaleX();
        json.scaleY = this.getScaleY();
        json.rotation = _cut(this.getRotation());
        json.direction = _cut(this.getDirection());
        json.width = _cut(this.getWidth());
        json.height = _cut(this.getHeight());
        json.font = this.getFont();
        json.visible = this.getVisible();

        if (this.parent.objectType === 'textBox') {
            json.colour = this.getColour();
            json.text = this.getText();
            json.textAlign = this.getTextAlign();
            json.lineBreak = this.getLineBreak();
            json.bgColor = this.getBGColour();
            json.underLine = this.getUnderLine();
            json.strike = this.getStrike();
            json.fontSize = this.getFontSize();
        }
        return json;
    }

    /**
     * Return initial effect value
     * @return {effect}
     */
    setInitialEffectValue() {
        this.effect = this.getInitialEffectValue();
        Entry.requestUpdate = true;
    }

    /**
     * Return initial effect value
     * @return {effect}
     */
    getInitialEffectValue() {
        return {
            blur: 0,
            hue: 0,
            hsv: 0,
            brightness: 0,
            contrast: 0,
            saturation: 0,
            alpha: 1,
        };
    }

    /**
     * Return initial effect value
     * @return {effect} eff
     */
    setVoiceProp(prop) {
        const { speed = 0, pitch = 0, speaker = 'kyuri', volume = 1 } = prop;
        this.voice = { speed, pitch, speaker, volume };
    }

    /**
     * Return initial effect value
     * @return {effect}
     */
    getVoiceProp() {
        return this.voice;
    }

    /**
     * remove brush
     */
    removeBrush() {
        this._removeShapes();
        this.brush = null;
    }

    /**
     * erase brush
     */
    eraseBrush() {
        this._removeShapes();
        Entry.requestUpdate = true;
    }
    /**
     * @local _removeShapes
     */
    _removeShapes() {
        const container = Entry.stage.selectedObjectContainer;
        const shapes = this.shapes;
        const LEN = shapes.length;
        let s;
        for (let i = 0; i < LEN; i++) {
            s = shapes[i];
            container.removeChild(s);
            s.destroy && s.destroy(true); //pixi 일때만 호출
        }
        this.shapes = [];
    }
    /**
     * updateBG
     */
    updateBG() {
        if (!this.bgObject) {
            return;
        }
        this.bgObject.graphics.clear();
        const width = this.getWidth();
        const height = this.getHeight();
        const bgColor = this.getBGColour();
        const hasColor = (bgColor || '').indexOf('#') === 0;
        this.bgObject.alpha = hasColor ? 1 : 0;

        this.bgObject.graphics.beginFill(bgColor).drawRect(-width / 2, -height / 2, width, height);
        if (this.getLineBreak()) {
            this.bgObject.x = 0;
        } else {
            const fontAlign = this.getTextAlign();
            switch (fontAlign) {
                case Entry.TEXT_ALIGN_LEFT:
                    this.bgObject.x = width / 2;
                    break;
                case Entry.TEXT_ALIGN_CENTER:
                    this.bgObject.x = 0;
                    break;
                case Entry.TEXT_ALIGN_RIGHT:
                    this.bgObject.x = -width / 2;
                    break;
            }
        }
    }
    /**
     * alignTextBox
     */
    alignTextBox() {
        if (this.type !== 'textBox') {
            return;
        }
        const textObject = this.textObject;
        const isWebGL = GEHelper.isWebGL;
        if (this.lineBreak) {
            if (isWebGL) {
                textObject.y = -this.getHeight() / 2;
            } else {
                textObject.y = textObject.getMeasuredLineHeight() / 2 - this.getHeight() / 2;
            }

            if (this.fontType === 'Nanum Gothic Coding') {
                textObject.y += 10;
            }

            switch (this.textAlign) {
                case Entry.TEXT_ALIGN_CENTER:
                    textObject.x = 0;
                    break;
                case Entry.TEXT_ALIGN_LEFT:
                    textObject.x = -this.getWidth() / 2;
                    break;
                case Entry.TEXT_ALIGN_RIGHT:
                    textObject.x = this.getWidth() / 2;
                    break;
            }
            if (isWebGL) {
                textObject.style.maxHeight = this.getHeight();
            } else {
                textObject.maxHeight = this.getHeight();
            }
        } else {
            textObject.x = 0;
            textObject.y = 0;
        }
    }
    /**
     * syncDialogVisible
     */
    syncDialogVisible() {
        if (this.dialog) {
            this.dialog.object.visible = this.visible;
        }
    }
    /**
     * addStamp
     */
    addStamp() {
        const stampEntity = new Entry.StampEntity(this.parent, this);
        const stage = Entry.stage;
        stage.loadEntity(stampEntity, stage.selectedObjectContainer.getChildIndex(this.object));
        this.stamps.push(stampEntity);

        Entry.requestUpdate = true;
    }
    /**
     * removeStamps
     */
    removeStamps() {
        this.stamps.forEach((s) => s.destroy());
        this.stamps = [];
        Entry.requestUpdate = true;
    }
    /**
     * destroy
     * @param {boolean} isClone
     */
    destroy(isClone) {
        if (this.removed) {
            return;
        }

        this.removed = true;

        const object = this.object;
        if (object) {
            GEHelper.colorFilter.setCache(this, false);
            object.removeAllEventListeners && object.removeAllEventListeners();
            delete object.image;
            delete object.entity;
        }

        if (this._scaleAdaptor) {
            this._scaleAdaptor.destroy();
            this._scaleAdaptor = null;
        }

        if (this.stamps) {
            this.removeStamps();
        }

        _.result(this.dialog, 'remove');
        this.brush && this.removeBrush();
        Entry.stage.unloadEntity(this);

        //pixi 전용 코드
        object && object.destroy && object.destroy({ children: true });
    }
    /**
     * cache
     */
    cache() {
        const { object } = this;
        if (object) {
            if (!GEHelper.isWebGL) {
                object.cache(0, 0, this.getWidth(), this.getHeight());
            }
            Entry.requestUpdate = true;
        }
    }
    /**
     * reset
     */
    reset() {
        this.loadSnapshot();
        this.resetFilter();
        _.result(this.dialog, 'remove');
        this.shapes.length && this.removeBrush();
    }
    /**
     * @local _syncFontStyle
     */
    _syncFontStyle() {
        this.textObject.font = this.getFont();
        if (!GEHelper.isWebGL) {
            return;
        }
        const style = this.textObject.style;
        style.fontSize = `${this.getFontSize()}px`;
        style.fontStyle = this.fontItalic ? 'italic' : 'normal';
        style.fontWeight = this.fontBold ? 'bold' : 'normal';
        style.fontFamily = this.fontType;
    }
};
