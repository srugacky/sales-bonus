/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   const { discount, sale_price, quantity } = purchase;
   const discountRatio = 1 - (discount / 100);
   return sale_price * quantity * discountRatio;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    if (index === 0) {
        return profit * 0.15;
    } else if (index === (total - 1)) {
        return 0;
    } else if (index === 1 || index === 2) {
        return profit * 0.1;
    } else {
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    const { calculateRevenue, calculateBonus } = options; // Сюда передадим функции для расчётов

    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.purchase_records)
        || !Array.isArray(data.products)
        || !Array.isArray(data.customers)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.customers.length === 0
    ){
            throw new Error('Некорректные входные данные');
    } 
    
    if (typeof calculateRevenue !== "function"
        || typeof calculateBonus !== "function"
    ) {
            throw new Error('Чего-то не хватает');
    }
    
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));
    
    const sellerIndex = Object.fromEntries(sellerStats.map(seller => [seller.id, seller]));   
    const productIndex = Object.fromEntries(data.products.map(item => [item.sku, item]));  
    
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count++;
        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity; //себестоимость товаров в чеке
            const revenue = calculateSimpleRevenue(item); //общая выручка с чека с учетом скидки
            seller.profit += (revenue - cost);

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku]++;
        })
    })

    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold).map(([key, value]) => ({
            sku: key,
            quantity: value
        }));
        seller.top_products = seller.top_products.sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }))
}
