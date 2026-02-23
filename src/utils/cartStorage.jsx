const CART_KEY = "cart_items";

export const getCartItems = () => {
    try {
        const raw = localStorage.getItem(CART_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
};

const saveCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("cart_updated"));
    return cart;
};

// ✅ elimina por cartKey (preferido) o por id
export const removeCartItem = (keyOrId) => {
    try {
        const cart = getCartItems();
        const k = String(keyOrId ?? "");
        const next = cart.filter((x) => String(x?.cartKey || "") !== k && String(x?.id ?? "") !== k);
        return saveCart(next);
    } catch (e) {
        console.error("removeCartItem:", e);
        return getCartItems();
    }
};

export const clearCart = () => {
    try {
        return saveCart([]);
    } catch (e) {
        console.error("clearCart:", e);
        return [];
    }
};

// ✅ suma/resta cantidad por cartKey (preferido) o por id
export const updateCartQty = (keyOrId, delta) => {
    try {
        const cart = getCartItems();
        const k = String(keyOrId ?? "");
        const idx = cart.findIndex((x) => String(x?.cartKey || "") === k || String(x?.id ?? "") === k);
        if (idx === -1) return cart;

        const curQty = Number(cart[idx]?.cantidad || 0);
        const newQty = curQty + Number(delta || 0);

        if (newQty <= 0) {
            cart.splice(idx, 1);
            return saveCart(cart);
        }

        const precio = Number(cart[idx]?.precio_unitario || cart[idx]?.valor || 0);
        cart[idx] = {
            ...cart[idx],
            cantidad: newQty,
            subtotal: precio * newQty,
            updated_at: new Date().toISOString(),
        };

        return saveCart(cart);
    } catch (e) {
        console.error("updateCartQty:", e);
        return getCartItems();
    }
};
