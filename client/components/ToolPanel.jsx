import { useEffect, useState } from "react";
import { Mic } from "react-feather";


function OrderSummaryDisplay({ orderData }) {
  // Add null checks to prevent white screen
  if (!orderData) {
    return (
      <div className="text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
        <p className="font-semibold">Error: No order data received</p>
        <p className="text-sm mt-1">orderData is null or undefined</p>
      </div>
    );
  }

  if (orderData.error) {
    return (
      <div className="text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
        <p className="font-semibold">Error loading order</p>
        <p className="text-sm mt-1">{orderData.message || "Unknown error"}</p>
      </div>
    );
  }

  if (!orderData.order_summary) {
    return (
      <div className="text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
        <p className="font-semibold">Error: Missing order_summary</p>
        <p className="text-sm mt-1">Received data structure:</p>
        <pre className="text-xs mt-2 bg-white p-2 rounded overflow-x-auto">
          {JSON.stringify(orderData, null, 2)}
        </pre>
      </div>
    );
  }

  const { order_summary, grand_total } = orderData;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <span className="w-1 h-5 bg-blue-400 rounded-full"></span>
        Order Summary
      </h3>
      <div className="space-y-3">
        {order_summary.map((item, index) => (
          <div key={index} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg hover:bg-white/15 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-white">{item.item_name}</span>
              <span className="font-black text-blue-400 text-lg drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">{item.item_total}</span>
            </div>
            <div className="text-sm text-white/60 space-y-1 font-medium">
              {item.quantity && <div>Quantity: <span className="text-white">{item.quantity}</span></div>}
              {item.weight && <div>Weight: <span className="text-white">{item.weight} kg</span></div>}
              <div className="text-xs text-white/40 mt-1">{item.price_per_unit}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
          <span className="text-xl font-bold text-white/90">Grand Total</span>
          <span className="text-2xl font-black text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.6)]">{grand_total}</span>
        </div>
      </div>
    </div>
  );
}

function OrderConfirmation({ confirmationData }) {
  // Add null checks to prevent white screen
  if (!confirmationData || !confirmationData.order_id) {
    return (
      <div className="text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
        <p className="font-semibold">Error loading order confirmation</p>
        <p className="text-sm mt-1">Confirmation data is missing or incomplete.</p>
      </div>
    );
  }

  const { order_id, message } = confirmationData;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-green-500/10 border border-green-500/20 backdrop-blur-xl rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/20 rounded-xl">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-white">Order Confirmed</h3>
        </div>
        <div className="space-y-4">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex justify-between items-center">
            <span className="text-sm font-bold text-white/50 uppercase tracking-widest">Order ID</span>
            <span className="text-lg font-black text-white tracking-widest bg-white/10 px-3 py-1 rounded-lg border border-white/10">{order_id}</span>
          </div>
          <p className="text-md text-white/70 leading-relaxed font-medium bg-white/5 p-4 rounded-2xl border border-white/5">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
  stopSession,
}) {
  const [orderSummary, setOrderSummary] = useState(null);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [accumulatedItems, setAccumulatedItems] = useState([]); // Track all items in current order
  const [shouldEndSession, setShouldEndSession] = useState(false); // Track if session should end after AI response
  const [processedCallIds] = useState(new Set());

  useEffect(() => {
    if (!events || events.length === 0) return;

    // Check recent events for tool calls
    const recentEvents = events.slice(0, 5);

    recentEvents.forEach(mostRecentEvent => {
      // Check if AI has finished responding and we should end the session
      if (mostRecentEvent.type === "output_audio_buffer.stopped" && shouldEndSession) {
        console.log("AI response completed, ending session now...");
        setShouldEndSession(false); // Reset flag

        // Call the stopSession function passed from App
        stopSession();
        return;
      }

      if (
        mostRecentEvent.type === "response.done" &&
        mostRecentEvent.response.output
      ) {
        mostRecentEvent.response.output.forEach(async (output) => {
          if (output.type === "function_call") {
            // Prevent duplicate processing
            if (processedCallIds.has(output.call_id)) {
              return;
            }

            // Mark as processed immediately
            processedCallIds.add(output.call_id);
            console.log("Processing function call:", output.call_id, output.name);

            // Handle make_order - display summary on UI
            if (output.name === "make_order") {
              console.log("Make order function call detected:", output);

              try {
                // Parse the arguments to get the new items
                const newItems = JSON.parse(output.arguments).items || [];
                console.log("New items from AI:", newItems);

                // Merge with accumulated items
                const mergedItems = [...accumulatedItems, ...newItems];
                console.log("Merged items (accumulated + new):", mergedItems);

                // Update accumulated items state
                setAccumulatedItems(mergedItems);

                // Call backend to execute the tool with ALL accumulated items
                const response = await fetch("/execute-tool", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: output.id,
                    name: output.name,
                    call_id: output.call_id,
                    arguments: { items: mergedItems }, // Send all accumulated items
                  }),
                });

                const data = await response.json();
                console.log("Make order response:", data);

                // Extract the actual order data from the wrapped response
                const orderData = data.output || data;
                console.log("Order summary exists?", !!orderData.order_summary);
                console.log("Extracted order data:", JSON.stringify(orderData, null, 2));

                // Display order summary in UI
                if (orderData && orderData.order_summary) {
                  setOrderSummary(orderData);
                  setOrderConfirmation(null); // Clear any previous confirmation
                } else {
                  console.error("Invalid order data structure:", data);
                  setOrderSummary({
                    error: true,
                    message: "Invalid order data received from server"
                  });
                }

                // Send the function output back to the model
                sendClientEvent({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: output.call_id,
                    output: JSON.stringify(orderData), // Send the actual order data
                  },
                });

                // Trigger a response from the model
                sendClientEvent({ type: "response.create" });
              } catch (error) {
                console.error("Error executing make_order:", error);
              }

            }
            // Handle place_order - display confirmation on UI
            else if (output.name === "place_order") {
              console.log("Place order function call detected:", output);

              try {
                // Call backend to execute the tool
                const response = await fetch("/execute-tool", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: output.id,
                    name: output.name,
                    call_id: output.call_id,
                    arguments: JSON.parse(output.arguments),
                  }),
                });

                const data = await response.json();
                console.log("Place order response:", data);

                // Extract the actual confirmation data from the wrapped response
                const confirmationData = data.output || data;

                // Display confirmation in UI
                setOrderConfirmation(confirmationData);
                setOrderSummary(null); // Clear summary after placement
                setAccumulatedItems([]); // Clear accumulated items after successful order

                // Send the function output back to the model
                sendClientEvent({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: output.call_id,
                    output: JSON.stringify(confirmationData), // Send the actual confirmation data
                  },
                });

                // Trigger a response from the model
                sendClientEvent({ type: "response.create" });
              } catch (error) {
                console.error("Error executing place_order:", error);
              }
            }
            // Handle end_call - gracefully end the session
            else if (output.name === "end_call") {
              console.log("End call function detected:", output);

              try {
                // Call backend to execute the tool
                const response = await fetch("/execute-tool", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: output.id,
                    name: output.name,
                    call_id: output.call_id,
                    arguments: {},
                  }),
                });

                const data = await response.json();
                console.log("End call response:", data);

                // Send the function output back to the model
                sendClientEvent({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: output.call_id,
                    output: JSON.stringify(data),
                  },
                });

                // Trigger final response from the model
                sendClientEvent({ type: "response.create" });

                // Set flag to end session after AI finishes speaking
                setShouldEndSession(true);
                console.log("Set shouldEndSession flag - will end after AI responds");
              } catch (error) {
                console.error("Error executing end_call:", error);
              }
            }
            // Handle clear_order - reset order state
            else if (output.name === "clear_order") {
              console.log("Clear order function detected:", output);

              try {
                // Call backend to execute the tool
                const response = await fetch("/execute-tool", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: output.id,
                    name: output.name,
                    call_id: output.call_id,
                    arguments: {},
                  }),
                });

                const data = await response.json();
                console.log("Clear order response:", data);

                // Reset frontend state
                handleClearOrder();

                // Send the function output back to the model
                sendClientEvent({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: output.call_id,
                    output: JSON.stringify(data),
                  },
                });

                // Trigger response from the model
                sendClientEvent({ type: "response.create" });
              } catch (error) {
                console.error("Error executing clear_order:", error);
              }
            }
            // Handle all other tools
            else {
              try {
                // Call our backend to execute the tool
                const response = await fetch("/execute-tool", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: output.id,
                    name: output.name,
                    call_id: output.call_id,
                    arguments: JSON.parse(output.arguments),
                  }),
                });

                const data = await response.json();
                console.log("Backend response:", data);

                // Send the function output back to the model
                sendClientEvent({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: output.call_id,
                    output: JSON.stringify(data),
                  },
                });

                // Trigger a response from the model
                sendClientEvent({ type: "response.create" });
              } catch (error) {
                console.error("Error executing tool:", error);
              }
            }

          }
        });
      }
    });

  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setOrderSummary(null);
      setOrderConfirmation(null);
      processedCallIds.clear();
    }
  }, [isSessionActive]);

  // Function to clear the current order
  const handleClearOrder = () => {
    setAccumulatedItems([]);
    setOrderSummary(null);
    setOrderConfirmation(null);
  };

  return (
    <section className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {isSessionActive
          ? (
            <div className="flex flex-col h-full gap-6">
              <div className="sticky top-0 bg-white/5 backdrop-blur-xl z-20 pb-4 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="w-1.5 h-8 bg-blue-500 rounded-full"></span>
                  Order Management
                </h2>
                {accumulatedItems.length > 0 && (
                  <button
                    onClick={handleClearOrder}
                    className="w-full px-6 py-3 bg-red-500/80 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg backdrop-blur-md border border-white/10 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Order ({accumulatedItems.length})
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-6 pt-2">
                {orderSummary && <OrderSummaryDisplay orderData={orderSummary} />}
                {orderConfirmation && <OrderConfirmation confirmationData={orderConfirmation} />}
                {!orderSummary && !orderConfirmation && (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                      <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-white/80">Your basket is empty</p>
                    <p className="text-sm text-white/40 mt-2 px-8">Tell "Rehmat-e-Shereen" what you'd like to taste today!</p>
                  </div>
                )}
              </div>
            </div>
          )
          : (
            <div className="flex flex-col items-center justify-center h-full text-center px-10">
              <div className="w-24 h-24 bg-white/5 rounded-3xl backdrop-blur-lg flex items-center justify-center mb-8 border border-white/20 rotate-12 shadow-2xl">
                <Mic size={48} className="text-white/20 -rotate-12" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Order?</h3>
              <p className="text-white/60 leading-relaxed font-medium">
                Start the session to see your order summary, prices, and confirmations in real-time.
              </p>
            </div>
          )}
      </div>
    </section>
  );
}
