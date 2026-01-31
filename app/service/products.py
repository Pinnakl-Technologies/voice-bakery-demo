from app.service.db import CATEGORIES, PRODUCTS

def get_product_categories():
    return {
        "instruction": "List the names of the categories only. Do not provide descriptions unless specifically asked.",
        "categories": CATEGORIES
    }

def get_detailed_products(category: str):
    for i in PRODUCTS:
        if i["category"].lower() == category.lower():
            return {
                "instruction": "List the items available in this category. Keep the response brief.",
                "items": i["items"]
            }
    return {
        "error": f"Items under the category '{category}' are not available."
    }