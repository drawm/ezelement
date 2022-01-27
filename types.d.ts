interface Window {
  __get_method_handler: (elementUUID: string, handlerName: string) => VoidFunction | EventListener,
}
