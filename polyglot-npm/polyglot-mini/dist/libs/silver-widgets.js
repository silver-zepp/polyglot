/** @about Silver Widgets 1.0.0 @min_zeppos 2.0 @author: Silver, Zepp Health. @license: MIT */
import hmUI, { createWidget, widget, event, getTextLayout, align, text_style } from '@zos/ui';
import { getDeviceInfo, SCREEN_SHAPE_SQUARE } from '@zos/device';
import { px } from "@zos/utils";
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT, screenShape: SCREEN_SHAPE } = getDeviceInfo();

export function createPicker(options) {
	const widgets_arr = [];

	const bg_widget = createWidget(widget.FILL_RECT, {
		x: px(0),
		y: px(0),
		h: px(DEVICE_HEIGHT),
		w: px(DEVICE_WIDTH),
		color: options.bg_color || 0x000000,
	});

	widgets_arr.push(bg_widget);

	const zoom = options.zoom || 1.25;

	const normal_item_type = {
		type_id: 0,
		item_bg_color: options.normal_item_bg_color || 0x333333,
		item_bg_radius: options.item_bg_radius || 10,
		text_view: [
			{
				x: 20 * zoom,
				y: 0,
				w: (DEVICE_WIDTH - 40 * zoom), //w: DEVICE_WIDTH - 40,
				h: 40 * zoom,
				key: 'key',
				color: options.normal_text_color || 0xffffff,
				text_size: options.normal_text_size || 20 * zoom
			}
		],
		text_view_count: 1,
		item_height: 40 * zoom
	};

	const selected_item_type = {
		type_id: 1,
		item_bg_color: options.selected_item_bg_color || 0xff0000,
		item_bg_radius: options.item_bg_radius || 10,
		text_view: [
			{
				x: 24 * zoom,
				y: 0,
				w: (DEVICE_WIDTH - 40 * zoom), //w: DEVICE_WIDTH - 40,
				h: 40 * zoom,
				key: 'key',
				color: options.selected_text_color || 0xffffff,
				text_size: options.selected_text_size || 24 * zoom
			}
		],
		text_view_count: 1,
		item_height: 40 * zoom
	};

	const default_list_pos_y = SCREEN_SHAPE === SCREEN_SHAPE_SQUARE ? 0 : 120; //  20
	const default_list_height = SCREEN_SHAPE === SCREEN_SHAPE_SQUARE ? DEVICE_HEIGHT : 300; // DEVICE_HEIGHT - 40

    const use_rot_algo = options.use_rotation_algo;
    let onItemPress_cb = options.onItemPress;
    let onItemFocusChange_cb = options.onItemFocusChange;
    let data_array = options.data_array;
    let data_type_config = options.data_array.map((_, index) => ({
        start: index,
        end: index,
        type_id: index === options.selected_index ? 1 : 0
    }));

    if (use_rot_algo) {
        // rotation algorithm-related code
        const items_to_rotate = (options.selected_index + options.data_array.length - 2) % options.data_array.length;

        data_array = options.data_array.slice(items_to_rotate)
            .concat(options.data_array.slice(0, items_to_rotate));

        data_type_config = data_array.map((item, index) => ({
            start: index,
            end: index,
            type_id: index === 2 ? 1 : 0
        }));

        const index_map = data_array.map((_, rotated_index) => 
            (rotated_index + items_to_rotate) % options.data_array.length
        );

        const original_onItemPress_cb = options.onItemPress;

        onItemPress_cb = (widget_type, rotated_index, label) => {
            const original_index = index_map[rotated_index];
            original_onItemPress_cb(widget_type, original_index, options.data_array[original_index]);
        };

		if (options.onItemFocusChange) {
            const original_onItemFocusChange_cb = options.onItemFocusChange;
            onItemFocusChange_cb = (list, rotated_index, focus) => {
                const original_index = index_map[rotated_index];
                original_onItemFocusChange_cb(list, original_index, focus);
            };
        }
    }

	const picker_widget = createWidget(widget.SCROLL_LIST, {
		x: px(0),
		y: px(options.list_pos_y || default_list_pos_y), // 120, round, 480 base
		h: px(options.list_height || default_list_height), // 300, round, 480 base
		w: px(DEVICE_WIDTH),
		item_space: options.item_space || 10,
		snap_to_center: options.snap_to_center || true,
		item_enable_horizon_drag: false,
		item_drag_max_distance: 0,
		item_config: [normal_item_type, selected_item_type],
		item_config_count: 2,
		data_array: data_array.map(item => ({ key: item })),
        data_count: data_array.length,
        data_type_config: data_type_config,
        data_type_config_count: data_type_config.length,
		on_page: options.selected_page || 1, // Math.floor(options.selected_index / options.items_per_page)
		item_click_func: onItemPress_cb,
		item_focus_change_func: onItemFocusChange_cb,
	});

	widgets_arr.push(picker_widget);

	function removePicker() {
		widgets_arr.forEach(widget => hmUI.deleteWidget(widget));
	}

	return {
		remove: removePicker,
	};
}

// HELPERS
export function multiplyHexColor(hex_color, multiplier) {
	hex_color = Math.floor(hex_color).toString(16).padStart(6, "0");

	let r = parseInt(hex_color.substring(0, 2), 16);
	let g = parseInt(hex_color.substring(2, 4), 16);
	let b = parseInt(hex_color.substring(4, 6), 16);

	r = Math.min(Math.round(r * multiplier), 255);
	g = Math.min(Math.round(g * multiplier), 255);
	b = Math.min(Math.round(b * multiplier), 255);

	const result = "0x" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
	return result;
}