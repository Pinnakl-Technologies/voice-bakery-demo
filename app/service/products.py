import uuid
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
                "instruction": "List the items available in this category. Keep the response brief. Do not tell the prices unless the user asks.",
                "items": i["items"]
            }
    return {
        "error": f"Items under the category '{category}' are not available."
    }

def place_order(customer_name: str, mobile_number: str, items: list[dict]):
    """
    items: a list of dicts, e.g., [{"item_name": "gulab jamun", "quantity": "1kg", "weight": "1kg"}]
    """
    order_id = uuid.uuid4().hex[:4].upper()
    return {
        "status": "success",
        "order_id": order_id,
        "message": f"{customer_name}! your order has been placed successfully. Order ID: {order_id}. JazakAllah for ordering from Rehmat-e-Shereen.",
        "instruction": "Inform the user that their order has been placed successfully and provide the order ID. Maintain a warm and grateful tone."
    }