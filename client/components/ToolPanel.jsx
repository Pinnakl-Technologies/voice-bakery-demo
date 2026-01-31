import { useEffect, useState } from "react";


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
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-semibold text-gray-700">Order Summary</h3>
      <div className="space-y-2">
        {order_summary.map((item, index) => (
          <div key={index} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium text-gray-900">{item.item_name}</span>
              <span className="font-bold text-green-600">{item.item_total}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              {item.quantity && <div>Quantity: {item.quantity}</div>}
              {item.weight && <div>Weight: {item.weight} kg</div>}
              <div className="text-xs text-gray-500">{item.price_per_unit}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-3 border-t-2 border-gray-300">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Grand Total:</span>
          <span className="text-xl font-bold text-green-600">{grand_total}</span>
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-green-800">Order Confirmed!</h3>
        </div>
        <div className="mt-3 space-y-2">
          <div className="bg-white rounded p-3 border border-green-200">
            <span className="text-sm text-gray-600">Order ID: </span>
            <span className="text-lg font-bold text-gray-900">{order_id}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
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
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4 overflow-y-auto">
        {isSessionActive
          ? (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 bg-gray-50 z-10 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Order Management</h2>
                {accumulatedItems.length > 0 && (
                  <button
                    onClick={handleClearOrder}
                    className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Order ({accumulatedItems.length} item{accumulatedItems.length !== 1 ? 's' : ''})
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pt-4">
                {orderSummary && <OrderSummaryDisplay orderData={orderSummary} />}
                {orderConfirmation && <OrderConfirmation confirmationData={orderConfirmation} />}
                {!orderSummary && !orderConfirmation && (
                  <div className="text-center text-gray-500 mt-8">
                    <p>No active orders</p>
                    <p className="text-sm mt-2">Start speaking to place an order</p>
                  </div>
                )}
              </div>
            </div>
          )
          : <p className="text-gray-600">Start the session to place orders...</p>}
      </div>
    </section>
  );
}
