from app.service.products import (
    get_product_categories,
    get_detailed_products,
    place_order,
    make_order,
    end_call,
    clear_order
)

FUNCTION_DICT = {
    "get_product_categories": get_product_categories,
    "get_detailed_products": get_detailed_products,
    "place_order": place_order,
    "make_order": make_order,
    "end_call": end_call,
    "clear_order": clear_order
}
