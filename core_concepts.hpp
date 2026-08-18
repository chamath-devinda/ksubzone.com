#ifndef CORE_CONCEPTS_HPP
#define CORE_CONCEPTS_HPP

#include <type_traits>
#include <utility>
#include <iterator>
#include <string>
#include <iostream>
#include <concepts>

namespace ns {
namespace concepts {

// ============================================================================
// 1. Replicated Standard C++20 Core Language Concepts
// ============================================================================

/**
 * @brief Specifies that a type is the same as another type.
 */
template <typename T, typename U>
concept SameAs = std::is_same_v<T, U> && std::is_same_v<U, T>;

/**
 * @brief Specifies that a type is derived from another type.
 */
template <typename Derived, typename Base>
concept DerivedFrom = std::is_base_of_v<Base, Derived> &&
                      std::is_convertible_v<const volatile Derived*, const volatile Base*>;

/**
 * @brief Specifies that an expression of a given type can be implicitly converted to another type.
 */
template <typename From, typename To>
concept ConvertibleTo = std::is_convertible_v<From, To> && 
                        requires(std::add_rvalue_reference_t<From> (&f)()) {
                            static_cast<To>(f());
                        };

/**
 * @brief Specifies that two types share a common reference type.
 */
template <typename T, typename U>
concept CommonReferenceWith =
    SameAs<std::common_reference_t<T, U>, std::common_reference_t<U, T>> &&
    ConvertibleTo<T, std::common_reference_t<T, U>> &&
    ConvertibleTo<U, std::common_reference_t<T, U>>;

/**
 * @brief Specifies that two types share a common type.
 */
template <typename T, typename U>
concept CommonWith =
    SameAs<std::common_type_t<T, U>, std::common_type_t<U, T>> &&
    requires {
        static_cast<std::common_type_t<T, U>>(std::declval<T>());
        static_cast<std::common_type_t<T, U>>(std::declval<U>());
    } &&
    CommonReferenceWith<
        std::add_lvalue_reference_t<const T>,
        std::add_lvalue_reference_t<const U>> &&
    CommonReferenceWith<
        std::add_lvalue_reference_t<std::common_type_t<T, U>>,
        std::common_reference_t<
            std::add_lvalue_reference_t<const T>,
            std::add_lvalue_reference_t<const U>>>;

// ============================================================================
// 2. Arithmetic Concepts
// ============================================================================

/**
 * @brief Specifies that a type is an integral type.
 */
template <typename T>
concept Integral = std::is_integral_v<T>;

/**
 * @brief Specifies that a type is a signed integral type.
 */
template <typename T>
concept SignedIntegral = Integral<T> && std::is_signed_v<T>;

/**
 * @brief Specifies that a type is an unsigned integral type.
 */
template <typename T>
concept UnsignedIntegral = Integral<T> && !std::is_signed_v<T>;

/**
 * @brief Specifies that a type is a floating-point type.
 */
template <typename T>
concept FloatingPoint = std::is_floating_point_v<T>;

// ============================================================================
// 3. Lifetime and Object Construction Concepts
// ============================================================================

/**
 * @brief Specifies that an object of a type can be destroyed.
 */
template <typename T>
concept Destructible = std::is_nothrow_destructible_v<T>;

/**
 * @brief Specifies that an object of a type can be constructed from a set of arguments.
 */
template <typename T, typename... Args>
concept ConstructibleFrom = Destructible<T> && std::is_constructible_v<T, Args...>;

/**
 * @brief Specifies that an object of a type can be default-initialized.
 */
template <typename T>
concept DefaultInitializable =
    ConstructibleFrom<T> &&
    requires { T{}; } &&
    requires { ::new (std::declval<void*>()) T; };

/**
 * @brief Specifies that an object of a type can be move-constructed.
 */
template <typename T>
concept MoveConstructible = ConstructibleFrom<T, T> && ConvertibleTo<T, T>;

/**
 * @brief Specifies that an object of a type can be copy-constructed.
 */
template <typename T>
concept CopyConstructible =
    MoveConstructible<T> &&
    ConstructibleFrom<T, T&> && ConvertibleTo<T&, T> &&
    ConstructibleFrom<T, const T&> && ConvertibleTo<const T&, T> &&
    ConstructibleFrom<T, const T> && ConvertibleTo<const T, T>;

// ============================================================================
// 4. Assignment and Swappability
// ============================================================================

/**
 * @brief Specifies that a type is assignable from another type.
 */
template <typename LHS, typename RHS>
concept AssignableTo =
    std::is_lvalue_reference_v<LHS> &&
    CommonReferenceWith<
        const std::remove_reference_t<LHS>&,
        const std::remove_reference_t<RHS>&> &&
    requires(LHS lhs, RHS&& rhs) {
        { lhs = std::forward<RHS>(rhs) } -> SameAs<LHS>;
    };

namespace detail {
    using std::swap;
    template <typename T, typename U>
    concept SwappableWithHelper = requires(T&& t, U&& u) {
        swap(std::forward<T>(t), std::forward<U>(u));
    };
}

/**
 * @brief Specifies that lvalues of a type can be swapped.
 */
template <typename T>
concept Swappable = detail::SwappableWithHelper<T&, T&>;

/**
 * @brief Specifies that lvalues of two different types can be swapped.
 */
template <typename T, typename U>
concept SwappableWith =
    detail::SwappableWithHelper<T, U> &&
    detail::SwappableWithHelper<U, T> &&
    CommonReferenceWith<T, U> &&
    requires(T&& t, U&& u) {
        detail::SwappableWithHelper<T, T>;
        detail::SwappableWithHelper<U, U>;
    };

// ============================================================================
// 5. Semiregular and Regular Concepts
// ============================================================================

/**
 * @brief Specifies that a type can be moved and swapped.
 */
template <typename T>
concept Movable = std::is_object_v<T> && MoveConstructible<T> && AssignableTo<T&, T> && Swappable<T>;

/**
 * @brief Specifies that a type can be copied, moved, and swapped.
 */
template <typename T>
concept Copyable = CopyConstructible<T> && Movable<T> && AssignableTo<T&, const T&> && AssignableTo<T&, T&> && AssignableTo<T&, const T>;

/**
 * @brief Specifies that a type can be default-constructed, copied, moved, and swapped.
 */
template <typename T>
concept Semiregular = Copyable<T> && DefaultInitializable<T>;

// ============================================================================
// 6. Comparison Concepts
// ============================================================================

template <typename T, typename U>
concept WeaklyEqualityComparableWith =
    requires(const std::remove_reference_t<T>& t, const std::remove_reference_t<U>& u) {
        { t == u } -> ConvertibleTo<bool>;
        { t != u } -> ConvertibleTo<bool>;
        { u == t } -> ConvertibleTo<bool>;
        { u != t } -> ConvertibleTo<bool>;
    };

/**
 * @brief Specifies that a type supports equality comparison using the == operator.
 */
template <typename T>
concept EqualityComparable = WeaklyEqualityComparableWith<T, T>;

/**
 * @brief Specifies that two types support cross-type equality comparison using the == operator.
 */
template <typename T, typename U>
concept EqualityComparableWith =
    EqualityComparable<T> &&
    EqualityComparable<U> &&
    CommonReferenceWith<const std::remove_reference_t<T>&, const std::remove_reference_t<U>&> &&
    EqualityComparable<std::common_reference_t<const std::remove_reference_t<T>&, const std::remove_reference_t<U>&>> &&
    WeaklyEqualityComparableWith<T, U>;

/**
 * @brief Specifies that a type is regular (semiregular and supports equality comparison).
 */
template <typename T>
concept Regular = Semiregular<T> && EqualityComparable<T>;

template <typename T, typename U>
concept PartiallyOrderedWith =
    requires(const std::remove_reference_t<T>& t, const std::remove_reference_t<U>& u) {
        { t <  u } -> ConvertibleTo<bool>;
        { t >  u } -> ConvertibleTo<bool>;
        { t <= u } -> ConvertibleTo<bool>;
        { t >= u } -> ConvertibleTo<bool>;
        { u <  t } -> ConvertibleTo<bool>;
        { u >  t } -> ConvertibleTo<bool>;
        { u <= t } -> ConvertibleTo<bool>;
        { u >= t } -> ConvertibleTo<bool>;
    };

/**
 * @brief Specifies that the comparison operators on a type yield results consistent with a total ordering.
 */
template <typename T>
concept TotallyOrdered = EqualityComparable<T> && PartiallyOrderedWith<T, T>;

/**
 * @brief Specifies that the comparison operators on two different types yield results consistent with a total ordering.
 */
template <typename T, typename U>
concept TotallyOrderedWith =
    TotallyOrdered<T> &&
    TotallyOrdered<U> &&
    CommonReferenceWith<const std::remove_reference_t<T>&, const std::remove_reference_t<U>&> &&
    TotallyOrdered<std::common_reference_t<const std::remove_reference_t<T>&, const std::remove_reference_t<U>&>> &&
    EqualityComparableWith<T, U> &&
    PartiallyOrderedWith<T, U>;

// ============================================================================
// 7. Callable and Relation Concepts
// ============================================================================

/**
 * @brief Specifies that a callable type can be invoked with a set of arguments and returns a boolean-like result.
 */
template <typename F, typename... Args>
concept Predicate = std::is_invocable_v<F, Args...> &&
                    ConvertibleTo<std::invoke_result_t<F, Args...>, bool>;

/**
 * @brief Specifies that a relation is a relation on a set of arguments.
 */
template <typename R, typename T, typename U>
concept Relation =
    Predicate<R, T, T> &&
    Predicate<R, U, U> &&
    Predicate<R, T, U> &&
    Predicate<R, U, T>;

/**
 * @brief Specifies that a relation is an equivalence relation.
 */
template <typename R, typename T, typename U>
concept EquivalenceRelation = Relation<R, T, U>;

/**
 * @brief Specifies that a relation is a strict weak ordering.
 */
template <typename R, typename T, typename U>
concept StrictWeakOrdering = Relation<R, T, U>;

// ============================================================================
// 8. Advanced System and Utility Concepts
// ============================================================================

/**
 * @brief Verifies that a type is an iterator.
 */
template <typename I>
concept Iterator = requires(I i) {
    { *i } -> any_of; // can be dereferenced (returns reference or value)
    { ++i } -> SameAs<I&>;
    { i++ } -> SameAs<I>;
};

/**
 * @brief Verifies that a type is an input iterator.
 */
template <typename T>
concept InputIterator = requires(T it) {
    { *it } -> SameAs<typename std::iterator_traits<T>::reference>;
    { ++it } -> SameAs<T&>;
    { it++ } -> SameAs<T>;
} && DerivedFrom<typename std::iterator_traits<T>::iterator_category, std::input_iterator_tag>;

/**
 * @brief Verifies that a type is a forward iterator.
 */
template <typename T>
concept ForwardIterator = InputIterator<T> &&
    DerivedFrom<typename std::iterator_traits<T>::iterator_category, std::forward_iterator_tag> &&
    requires(T it) {
        { it == it } -> ConvertibleTo<bool>;
        { it != it } -> ConvertibleTo<bool>;
    };

/**
 * @brief Verifies that a type is a bidirectional iterator.
 */
template <typename T>
concept BidirectionalIterator = ForwardIterator<T> &&
    DerivedFrom<typename std::iterator_traits<T>::iterator_category, std::bidirectional_iterator_tag> &&
    requires(T it) {
        { --it } -> SameAs<T&>;
        { it-- } -> SameAs<T>;
    };

/**
 * @brief Verifies that a type is a random-access iterator.
 */
template <typename T>
concept RandomAccessIterator = BidirectionalIterator<T> &&
    DerivedFrom<typename std::iterator_traits<T>::iterator_category, std::random_access_iterator_tag> &&
    requires(T it, typename std::iterator_traits<T>::difference_type n) {
        { it + n } -> SameAs<T>;
        { it - n } -> SameAs<T>;
        { it += n } -> SameAs<T&>;
        { it -= n } -> SameAs<T&>;
        { it[n] } -> SameAs<typename std::iterator_traits<T>::reference>;
        { it - it } -> SameAs<typename std::iterator_traits<T>::difference_type>;
    };

/**
 * @brief Verifies that a container or range can be iterated over.
 */
template <typename T>
concept Iterable = requires(T& t) {
    { std::begin(t) } -> InputIterator;
    { std::end(t) } -> SameAs<decltype(std::begin(t))>;
};

/**
 * @brief Verifies that a container or range supports bidirectional iteration.
 */
template <typename T>
concept BidirectionalIterable = Iterable<T> && requires(T& t) {
    { std::begin(t) } -> BidirectionalIterator;
};

/**
 * @brief Verifies that a container or range supports random-access iteration.
 */
template <typename T>
concept RandomAccessIterable = Iterable<T> && requires(T& t) {
    { std::begin(t) } -> RandomAccessIterator;
};

/**
 * @brief Verifies that a type is callable with a specific set of argument types.
 */
template <typename F, typename... Args>
concept Callable = requires(F&& f, Args&&... args) {
    std::invoke(std::forward<F>(f), std::forward<Args>(args)...);
};

/**
 * @brief Verifies that a type is callable with a specific set of arguments and returns a specified type.
 */
template <typename F, typename R, typename... Args>
concept CallableWithResult = Callable<F, Args...> && ConvertibleTo<std::invoke_result_t<F, Args...>, R>;

/**
 * @brief Verifies that a type supports basic exclusive locking (e.g. std::mutex).
 */
template <typename T>
concept BasicLockable = requires(T l) {
    { l.lock() } -> SameAs<void>;
    { l.unlock() } -> SameAs<void>;
};

/**
 * @brief Verifies that a type supports non-blocking exclusive locking.
 */
template <typename T>
concept Lockable = BasicLockable<T> && requires(T l) {
    { l.try_lock() } -> ConvertibleTo<bool>;
};

/**
 * @brief Verifies that a type supports shared locking/unlocking.
 */
template <typename T>
concept SharedLockable = Lockable<T> && requires(T l) {
    { l.lock_shared() } -> SameAs<void>;
    { l.unlock_shared() } -> SameAs<void>;
    { l.try_lock_shared() } -> ConvertibleTo<bool>;
};

/**
 * @brief Helper trait that can be specialized by users to indicate a class is thread-safe.
 */
template <typename T>
struct is_thread_safe : std::false_type {};

/**
 * @brief Verifies if a type is thread-safe (either explicitly marked, supports atomic operations, or has lockable capabilities).
 */
template <typename T>
concept ThreadSafe = is_thread_safe<T>::value || requires(T t) {
    { t.is_lock_free() } -> SameAs<bool>;
} || BasicLockable<T>;

/**
 * @brief Verifies that a class behaves as a standard-conforming allocator.
 */
template <typename T>
concept Allocator = requires {
    typename T::value_type;
} && requires(T a, size_t n, typename T::value_type* p) {
    { a.allocate(n) } -> SameAs<typename T::value_type*>;
    { a.deallocate(p, n) } -> SameAs<void>;
} && EqualityComparable<T>;

/**
 * @brief Verifies that a type can be serialized using streams or custom serialize method.
 */
template <typename T>
concept StreamSerializable = requires(std::ostream& os, std::istream& is, T& val) {
    { os << val } -> SameAs<std::ostream&>;
    { is >> val } -> SameAs<std::istream&>;
};

template <typename T>
concept CustomSerializable = requires(T val) {
    { val.serialize() } -> ConvertibleTo<std::string>;
};

template <typename T>
concept Serializable = StreamSerializable<T> || CustomSerializable<T>;

/**
 * @brief Verifies that a type is a number and supports standard arithmetic and comparison operations.
 */
template <typename T>
concept Numeric = requires(T a, T b) {
    { a + b } -> SameAs<T>;
    { a - b } -> SameAs<T>;
    { a * b } -> SameAs<T>;
    { a / b } -> SameAs<T>;
    { +a } -> SameAs<T>;
    { -a } -> SameAs<T>;
    { a += b } -> SameAs<T&>;
    { a -= b } -> SameAs<T&>;
    { a *= b } -> SameAs<T&>;
    { a /= b } -> SameAs<T&>;
} && TotallyOrdered<T>;

// Helper to constrain the Iterator concept
struct any_of {
    template <typename T>
    operator T() const;
};

} // namespace concepts

// ============================================================================
// 9. Custom Diagnostic Helpers
// ============================================================================
namespace diagnostics {

    template <typename T>
    struct check_copyable {
        static_assert(concepts::Copyable<T>, "Error: The specified type does not satisfy the 'Copyable' concept (requires copy constructor, copy assignment, and move/swap support).");
        static constexpr bool value = concepts::Copyable<T>;
    };

    template <typename T>
    struct check_movable {
        static_assert(concepts::Movable<T>, "Error: The specified type does not satisfy the 'Movable' concept (requires move constructor, move assignment, and swappability).");
        static constexpr bool value = concepts::Movable<T>;
    };

    template <typename T>
    struct check_numeric {
        static_assert(concepts::Numeric<T>, "Error: The specified type does not satisfy the 'Numeric' concept (requires arithmetic operators and total ordering).");
        static constexpr bool value = concepts::Numeric<T>;
    };

    template <typename T>
    struct check_iterable {
        static_assert(concepts::Iterable<T>, "Error: The specified type does not satisfy the 'Iterable' concept (requires begin/end iterators supporting input iterator operations).");
        static constexpr bool value = concepts::Iterable<T>;
    };

    template <typename T>
    struct check_lockable {
        static_assert(concepts::Lockable<T>, "Error: The specified type does not satisfy the 'Lockable' concept (requires lock, unlock, and try_lock operations).");
        static constexpr bool value = concepts::Lockable<T>;
    };

    template <typename T>
    struct check_allocator {
        static_assert(concepts::Allocator<T>, "Error: The specified type does not satisfy the 'Allocator' concept (requires value_type, allocate, deallocate, and equality comparison).");
        static constexpr bool value = concepts::Allocator<T>;
    };

    template <typename T>
    struct check_serializable {
        static_assert(concepts::Serializable<T>, "Error: The specified type does not satisfy the 'Serializable' concept (requires stream insertion/extraction or a .serialize() member function).");
        static constexpr bool value = concepts::Serializable<T>;
    };

} // namespace diagnostics
} // namespace ns

#endif // CORE_CONCEPTS_HPP
