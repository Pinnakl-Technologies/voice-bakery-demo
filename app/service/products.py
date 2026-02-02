import uuid
from app.service.db import CATEGORIES, PRODUCTS

def get_product_categories():
    return {
        "instruction": "You have the full category list now. DON'T list all of them. Based on what the customer said they need, suggest only 2-3 RELEVANT categories conversationally. Ask which one interests them. Example: 'ہمارے پاس کلاسک مٹھائیاں، حلوے، آئس کریم ہیں۔ آپ کو کیا پسند ہے؟'",
        "categories": CATEGORIES
    }



def get_detailed_products(category: str):
    """
    Get products for a category. Handles both English and Urdu category names.
    """
    category_lower = category.lower().strip()
    
    for product_group in PRODUCTS:
        # Check both the main category name and the Urdu name
        cat_name = product_group.get("category", "").lower()
        cat_urdu = product_group.get("category_urdu", "")
        
        # Match if either English or Urdu name matches
        if (category_lower == cat_name or 
            category == cat_urdu or 
            category_lower in cat_name or
            cat_name in category_lower):
            
            return {
                "instruction": "You now have the full product list for this category. DON'T read all of them. Pick 2-4 POPULAR or RELEVANT items and mention them as suggestions. Frame it naturally: 'اس میں گلاب جامن، بارفی، لڈو جیسی چیزیں ہیں۔ کیا ان میں سے کچھ پسند ہے؟' Let the customer ask if they want to hear more options.",
                "category": product_group.get("category"),
                "category_urdu": cat_urdu,
                "items": product_group["items"]
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

def end_call():
    """
    End the call gracefully. This should be called when the user wants to end the conversation.
    """
    return {
        "status": "success",
        "message": "Allah Hafiz! Thank you for calling Rehmat-e-Shereen. Have a blessed day!",
        "instruction": "Say a warm goodbye in Urdu (Allah Hafiz) and thank them for calling. After this response, the call will automatically end.",
        "action": "end_session"
    }

def clear_order():
    """
    Clear all items from the current pending order.
    """
    return {
        "status": "success",
        "message": "Your order has been cleared. You can start a new order now.",
        "instruction": "Inform the user that their order has been cleared and ask what they would like to order instead."
    }

def make_order(items: list[dict]):
    """
    Calculate the total cost for the order and provide a summary.
    items: a list of dicts, e.g., [{"item_name": "gulab jamun", "quantity": "2", "weight": "1kg"}]
    """
    import re
    
    if not items or len(items) == 0:
        return {
            "error": "No items provided for the order."
        }
    
    order_summary = []
    grand_total = 0
    
    for order_item in items:
        item_name = order_item.get("item_name", "").strip() if order_item.get("item_name") else ""
        quantity_str = order_item.get("quantity", "").strip() if order_item.get("quantity") else ""
        weight_str = order_item.get("weight", "").strip() if order_item.get("weight") else ""
        
        if not item_name:
            continue
        
        # Find the item in the database
        found_item = None
        for category_data in PRODUCTS:
            for db_item in category_data["items"]:
                if db_item["name"].lower() == item_name.lower():
                    found_item = db_item
                    break
            if found_item:
                break
        
        if not found_item:
            order_summary.append({
                "item_name": item_name,
                "error": f"Item '{item_name}' not found in the database."
            })
            continue
        
        # Extract price
        try:
            price = float(found_item.get("price", 0) or 0)
        except (ValueError, TypeError):
            price = 0
        
        price_unit = found_item.get("price_unit", "")
        requires_weight = found_item.get("requires_weight", False)
        requires_quantity = found_item.get("requires_quantity", False)
        
        # Parse quantity
        quantity = 1
        if quantity_str:
            try:
                # Extract numeric part from strings like "2", "2 boxes", etc.
                match = re.search(r'(\d+\.?\d*)', quantity_str)
                if match:
                    quantity = float(match.group(1))
                    if quantity == 0:
                        quantity = 1
            except (ValueError, TypeError):
                quantity = 1
        
        # Parse weight
        weight = 1
        if weight_str:
            try:
                # Extract numeric part from strings like "1kg", "500g", "2 pounds"
                match = re.search(r'(\d+\.?\d*)', weight_str)
                if match:
                    weight = float(match.group(1))
                    if weight == 0:
                        weight = 1
                    # Convert grams to kg if needed
                    if 'g' in weight_str.lower() and 'kg' not in weight_str.lower():
                        weight = weight / 1000
            except (ValueError, TypeError):
                weight = 1
        
        # Calculate item total based on requirements
        item_total = 0
        if requires_weight and requires_quantity:
            # Both weight and quantity (e.g., 2 boxes of 1kg mithai)
            item_total = price * weight * quantity
        elif requires_weight:
            # Only weight (e.g., 2kg mithai)
            item_total = price * weight
        elif requires_quantity:
            # Only quantity (e.g., 5 ice cream scoops)
            item_total = price * quantity
        else:
            # Default
            item_total = price
        
        order_summary.append({
            "item_name": found_item["name"],
            "quantity": quantity if requires_quantity else None,
            "weight": weight if requires_weight else None,
            "price_per_unit": f"Rs. {price} {price_unit}",
            "item_total": f"Rs. {item_total:.2f}"
        })
        
        grand_total += item_total
    
    return {
        "order_summary": order_summary,
        "grand_total": f"Rs. {grand_total:.2f}",
        "instruction": "Present the order summary with individual item calculations and the grand total. Ask the user to confirm the order and provide their name and mobile number to proceed."
    }