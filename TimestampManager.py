import timestamp_manager as tm

mgr = tm.TimestampManager.get_instance()

def get_timestamp(type: str = "unix") -> str:
    """
    Get the current timestamp in the specified format.
    
    Args:
        fmt (str): The format of the timestamp. Can be 'iso', 'unix', or 'unix_double'.
    
    Returns:
        str: The current timestamp in the specified format.
    """
    return mgr.get_timestamp(type)

def get_unix_timestamp_double() -> float:
    """
    Get the current Unix timestamp as a double (float).
    
    Returns:
        float: The current Unix timestamp as a double.
    """
    return mgr.get_unix_timestamp_double()