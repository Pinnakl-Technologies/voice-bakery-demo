from app.service.products import (
    get_product_categories,
    get_detailed_products,
    place_order,
    make_order
)

FUNCTION_DICT = {
    get_product_categories.__name__: get_product_categories,
    get_detailed_products.__name__: get_detailed_products,
    place_order.__name__: place_order,
    make_order.__name__: make_order
}
