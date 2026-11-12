#!/usr/bin/env bash
# Two buyers at once. Each session holds its transaction open for a moment after placing the order, so the second one has to wait
# on the row lock and then sees the first one's result. Usage: concurrency.sh <socket dir> <port>
set -euo pipefail
DIR="$1"; PORT="$2"
P="psql -h $DIR -p $PORT -U postgres -d t -q -t -A -v ON_ERROR_STOP=1"
setup() { $P -c "update product_stock set quantity = 1 where product_id = (select id from products where slug = 'chicken-momo'); update settings set value = 'null' where key = 'max_orders_per_day'; delete from orders; delete from order_counters;" >/dev/null; }
order() { # $1 = product slug, $2 = extra json
  $P -c "begin; select public._place_order(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('slug','$1','qty',1)),'name','Buyer','phone','07700900123') || '$2'::jsonb, false, '2026-11-13 12:00:00+00'::timestamptz) ->> 'order_number'; select pg_sleep(1); commit;" 2>&1 | head -1
}
setup
r1="$(order chicken-momo '{}' &)"; sleep 0.2; r2="$(order chicken-momo '{}')"; wait
ok=$(printf '%s\n%s\n' "$r1" "$r2" | grep -c '^SS-' || true)
[ "$ok" = 1 ] || { echo "FAILED: two buyers for the last item, expected 1 success, got $ok ($r1 / $r2)"; exit 1; }
[ "$($P -c "select quantity from product_stock where product_id = (select id from products where slug = 'chicken-momo')")" = 0 ] || { echo "FAILED: stock is not 0"; exit 1; }
echo "ok - two simultaneous orders for the last item: exactly one succeeds, stock stays at 0"
# two simultaneous orders get different numbers
$P -c "update product_stock set quantity = 50; delete from orders; delete from order_counters;" >/dev/null
out="$( (order veg-momo '{}' > /tmp/c1.$$ &) ; sleep 0.2; order veg-momo '{}' > /tmp/c2.$$; wait; sleep 1.2; cat /tmp/c1.$$ /tmp/c2.$$ | sort -u | tr '\n' ' ')"
rm -f /tmp/c1.$$ /tmp/c2.$$
n=$(echo "$out" | tr ' ' '\n' | grep -c '^SS-' || true)
[ "$n" = 2 ] || { echo "FAILED: expected 2 different order numbers, got: $out"; exit 1; }
echo "ok - two simultaneous orders get different numbers ($out)"
# two simultaneous orders for the last place of a day: only one wins
$P -c "update settings set value = '1' where key = 'max_orders_per_day'; delete from orders where pickup_date = '2026-11-15';" >/dev/null
day='{"pickupDate":"2026-11-15","pickupTime":"12:30"}'
(order veg-momo "$day" > /tmp/d1.$$ &); sleep 0.2; order veg-momo "$day" > /tmp/d2.$$; sleep 1.2
n=$(cat /tmp/d1.$$ /tmp/d2.$$ | grep -c '^SS-' || true); rm -f /tmp/d1.$$ /tmp/d2.$$
[ "$n" = 1 ] || { echo "FAILED: daily limit of 1 with two simultaneous orders, got $n successes"; exit 1; }
[ "$($P -c "select count(*) from orders where pickup_date = '2026-11-15' and status <> 'cancelled'")" = 1 ] || { echo "FAILED: more than one order on the limited day"; exit 1; }
echo "ok - two simultaneous orders for the last place of a day: exactly one succeeds"
